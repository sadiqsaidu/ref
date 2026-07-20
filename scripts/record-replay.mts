// usage: npx tsx scripts/record-replay.mts <fixtureId> [name]
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseRecords } from "../src/lib/txline/api";
import { normalizeRaw } from "../src/lib/txline/map";

const [fixtureId, name = `fixture-${process.argv[2]}`] = process.argv.slice(2);
if (!fixtureId) {
  console.error("usage: npx tsx scripts/record-replay.mts <fixtureId> [name]");
  process.exit(1);
}

const origin = process.env.TXLINE_API_ORIGIN ?? "https://txline-dev.txodds.com";

const auth = await fetch(`${origin}/auth/guest/start`, { method: "POST" });
if (!auth.ok) throw new Error(`guest auth ${auth.status}`);
const { token } = (await auth.json()) as { token: string };

const res = await fetch(`${origin}/api/scores/historical/${fixtureId}`, {
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...(process.env.TXLINE_API_TOKEN
      ? { "X-Api-Token": process.env.TXLINE_API_TOKEN }
      : {}),
  },
});
if (!res.ok) throw new Error(`historical ${res.status}`);
const records = (parseRecords(await res.text()) as Record<string, unknown>[])
  .map(normalizeRaw)
  .filter((r) => typeof r.seq === "number")
  .sort((a, b) => a.seq - b.seq);

const dir = path.join(process.cwd(), "data", "replays");
await mkdir(dir, { recursive: true });
const file = path.join(dir, `${name}.json`);
await writeFile(file, JSON.stringify(records, null, 1));
console.log(`wrote ${records.length} records to ${file}`);
