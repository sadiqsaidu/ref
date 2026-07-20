// usage: npx tsx scripts/record-replay.mts <fixtureId> [name]
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { apiFetch, parseRecords, TxlineApiError } from "../src/lib/txline/api";
import { normalizeRaw } from "../src/lib/txline/map";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const [fixtureId, name = `fixture-${process.argv[2]}`] = process.argv.slice(2);
if (!fixtureId) {
  console.error("usage: npx tsx scripts/record-replay.mts <fixtureId> [name]");
  process.exit(1);
}

if (!process.env.TXLINE_API_TOKEN) {
  console.error("TXLINE_API_TOKEN is missing; add it to .env.local or the shell environment");
  process.exit(1);
}

let res: Response;
try {
  res = await apiFetch(`/scores/historical/${fixtureId}`);
} catch (e) {
  if (e instanceof TxlineApiError && (e.status === 401 || e.status === 403)) {
    console.error(
      `historical access denied (${e.status}); renew or reactivate TXLINE_API_TOKEN in .env.local`,
    );
    process.exit(1);
  }
  throw e;
}
const records = (parseRecords(await res.text()) as Record<string, unknown>[])
  .map(normalizeRaw)
  .filter((r) => typeof r.seq === "number")
  .sort((a, b) => a.seq - b.seq);
if (records.length === 0) {
  console.error(`no historical score records returned for fixture ${fixtureId}`);
  process.exit(1);
}

const dir = path.join(process.cwd(), "data", "replays");
await mkdir(dir, { recursive: true });
const file = path.join(dir, `${name}.json`);
await writeFile(file, JSON.stringify(records, null, 1));
console.log(`wrote ${records.length} records to ${file}`);
