// One-shot TxLINE mainnet free-tier activation. Run locally:
//   ANCHOR_WALLET=~/.config/solana/id.json npx tsx scripts/activate-mainnet.ts
// Needs devDependencies: @solana/web3.js, tweetnacl. Spends a small SOL fee.
import { readFileSync } from "node:fs";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import nacl from "tweetnacl";

const ORIGIN = "https://txline.txodds.com";
const RPC = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const PROGRAM = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
const TXL_MINT = new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL");
const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYSTEM = new PublicKey("11111111111111111111111111111111");

const SUBSCRIBE_DISCRIMINATOR = Uint8Array.from([254, 28, 191, 138, 156, 179, 183, 53]);
const SERVICE_LEVEL_ID = 12;
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = [];

function fail(msg: string): never {
  console.error(`FATAL: ${msg}`);
  process.exit(1);
}

if (/devnet|testnet/i.test(RPC)) fail(`RPC ${RPC} is not a mainnet endpoint`);
if (process.env.TXLINE_API_ORIGIN && process.env.TXLINE_API_ORIGIN !== ORIGIN)
  fail(`TXLINE_API_ORIGIN=${process.env.TXLINE_API_ORIGIN} does not match mainnet ${ORIGIN}`);

const walletPath = process.env.ANCHOR_WALLET ?? fail("ANCHOR_WALLET is not set");
const wallet = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf8"))),
);
console.log(`wallet: ${wallet.publicKey.toBase58()}`);

const connection = new Connection(RPC, "confirmed");
const genesis = await connection.getGenesisHash();
if (genesis !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d")
  fail(`RPC genesis hash ${genesis} is not Solana mainnet-beta`);

const balance = await connection.getBalance(wallet.publicKey);
console.log(`balance: ${balance / 1e9} SOL`);
if (balance === 0) fail("wallet has no SOL for fees");

const [pricingMatrix] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], PROGRAM);
const [tokenTreasury] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], PROGRAM);
const ata = (owner: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022.toBuffer(), TXL_MINT.toBuffer()],
    ATA_PROGRAM,
  )[0];

const data = Buffer.concat([
  SUBSCRIBE_DISCRIMINATOR,
  Buffer.from(Uint8Array.of(SERVICE_LEVEL_ID & 0xff, SERVICE_LEVEL_ID >> 8)),
  Buffer.from(Uint8Array.of(DURATION_WEEKS)),
]);

const ix = new TransactionInstruction({
  programId: PROGRAM,
  keys: [
    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    { pubkey: pricingMatrix, isSigner: false, isWritable: false },
    { pubkey: TXL_MINT, isSigner: false, isWritable: false },
    { pubkey: ata(wallet.publicKey), isSigner: false, isWritable: true },
    { pubkey: ata(tokenTreasury), isSigner: false, isWritable: true },
    { pubkey: tokenTreasury, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
    { pubkey: SYSTEM, isSigner: false, isWritable: false },
    { pubkey: ATA_PROGRAM, isSigner: false, isWritable: false },
  ],
  data,
});

console.log(`subscribing: service level ${SERVICE_LEVEL_ID}, ${DURATION_WEEKS} weeks…`);
const txSig = await connection.sendTransaction(new Transaction().add(ix), [wallet]);
const conf = await connection.confirmTransaction(txSig, "confirmed");
if (conf.value.err) fail(`subscribe transaction failed: ${JSON.stringify(conf.value.err)}`);
console.log(`subscribed: ${txSig}`);

const authRes = await fetch(`${ORIGIN}/auth/guest/start`, { method: "POST" });
if (!authRes.ok) fail(`guest auth ${authRes.status}`);
const { token: jwt } = (await authRes.json()) as { token: string };

const preimage = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
const walletSignature = Buffer.from(
  nacl.sign.detached(Buffer.from(preimage, "utf8"), wallet.secretKey),
).toString("base64");

const activateRes = await fetch(`${ORIGIN}/api/token/activate`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ txSig, walletSignature, leagues: SELECTED_LEAGUES }),
});
const body = await activateRes.text();
if (!activateRes.ok) fail(`token activation ${activateRes.status}: ${body}`);
const apiToken = body.trim().startsWith("{") ? JSON.parse(body).token : body.trim();
console.log("\nTXLINE_API_TOKEN:");
console.log(apiToken);
