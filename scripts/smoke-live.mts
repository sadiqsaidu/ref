// Confirm real mainnet data flows before wiring the UI to it. Run locally:
//   TXLINE_API_TOKEN=... npx tsx scripts/smoke-live.mts <fixtureId> [seconds]
import { parseSse } from "../src/lib/txline/api";
import { createMapper } from "../src/lib/txline/map";
import type { RawScore } from "../src/lib/types";

const [fixtureId, seconds = "30"] = process.argv.slice(2);
if (!fixtureId || !process.env.TXLINE_API_TOKEN) {
  console.error("usage: TXLINE_API_TOKEN=... npx tsx scripts/smoke-live.mts <fixtureId> [seconds]");
  process.exit(1);
}

const origin = process.env.TXLINE_API_ORIGIN ?? "https://txline.txodds.com";
const authRes = await fetch(`${origin}/auth/guest/start`, { method: "POST" });
if (!authRes.ok) throw new Error(`guest auth ${authRes.status}`);
const { token: jwt } = (await authRes.json()) as { token: string };

const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), Number(seconds) * 1000);

const res = await fetch(`${origin}/api/scores/stream?fixtureId=${fixtureId}`, {
  headers: {
    Accept: "text/event-stream",
    "Cache-Control": "no-cache",
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": process.env.TXLINE_API_TOKEN,
  },
  signal: ctrl.signal,
});
if (!res.ok || !res.body) throw new Error(`stream ${res.status}: ${await res.text()}`);
console.log(`connected to ${origin} fixture ${fixtureId} for ${seconds}s…\n`);

const map = createMapper();
let rawCount = 0;
let refCount = 0;
try {
  for await (const msg of parseSse(res.body)) {
    if (!msg.data || msg.event?.toLowerCase() === "heartbeat") continue;
    const raw = JSON.parse(msg.data) as RawScore;
    rawCount++;
    console.log(`RAW  seq=${raw.seq} action=${raw.action} statusId=${raw.statusId} stats=${JSON.stringify(raw.stats ?? {})}`);
    for (const e of map(raw)) {
      refCount++;
      console.log(`REF  ${e.minute ?? "—"}' ${e.phase} team=${e.team ?? "·"} ${e.kind} · ${e.detail}`);
    }
  }
} catch (e) {
  if (!ctrl.signal.aborted) throw e;
}
console.log(`\ndone: ${rawCount} raw messages → ${refCount} normalized events`);
