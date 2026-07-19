import type { RefEvent, Verify } from "./types";
import { apiFetch } from "./txline/api";

// Isolated so a swap to full on-chain validateStatV2 only touches this file.
const PROGRAMS = {
  mainnet: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
  devnet: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
};

export const network = () =>
  process.env.TXLINE_NETWORK === "devnet" ? "devnet" : "mainnet";

const STAT_KEYS: Partial<Record<RefEvent["kind"], string>> = {
  goal: "1,2",
  yellow: "3,4",
  second_yellow: "3,4",
  red: "5,6",
  corner: "7,8",
};

export async function verifyEvent(event: RefEvent): Promise<Verify> {
  const fixtureId = process.env.TXLINE_FIXTURE_ID;
  const seq = Number.parseInt(event.id, 10);
  if (!fixtureId || !Number.isInteger(seq) || seq <= 0) return { status: "pending" };
  try {
    const res = await apiFetch(
      `/scores/stat-validation?fixtureId=${fixtureId}&seq=${seq}&statKeys=${STAT_KEYS[event.kind] ?? "1,2"}`,
    );
    const proof: { eventStatRoot?: unknown } = await res.json();
    if (!proof?.eventStatRoot) return { status: "failed" };
    const net = network();
    return {
      status: "anchored",
      ref: `https://explorer.solana.com/address/${PROGRAMS[net]}${net === "devnet" ? "?cluster=devnet" : ""}`,
    };
  } catch {
    return { status: "pending" };
  }
}
