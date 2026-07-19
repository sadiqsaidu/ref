// Pre-kickoff check: confirm every endpoint path this app uses exists in the
// published OpenAPI spec. Our paths came from a third-party SDK's source.
//   npx tsx scripts/verify-endpoints.ts
export {};

const origin = process.env.TXLINE_API_ORIGIN ?? "https://txline.txodds.com";

const USED: [path: string, usedBy: string][] = [
  ["/auth/guest/start", "auth (api.ts, scripts)"],
  ["/scores/stream", "live source"],
  ["/scores/historical/{fixtureId}", "record-replay.mts"],
  ["/scores/stat-validation", "verify.ts"],
  ["/fixtures/snapshot", "team names (api/fixtures)"],
  ["/token/activate", "activate-mainnet.mts"],
];

const res = await fetch(`${origin}/docs/docs.yaml`);
if (!res.ok) {
  console.error(`FATAL: could not fetch ${origin}/docs/docs.yaml (${res.status})`);
  process.exit(1);
}
const yaml = await res.text();

// path keys in the spec: indented lines ending with ":" that start with "/"
const specPaths = [...yaml.matchAll(/^\s{1,6}(\/[^\s:]+):\s*$/gm)].map((m) => m[1]);
const normalize = (p: string) =>
  p.replace(/^\/api/, "").replace(/\{[^}]+\}/g, "{}").toLowerCase();
const normalized = new Map(specPaths.map((p) => [normalize(p), p]));

let missing = 0;
console.log(`spec: ${specPaths.length} paths from ${origin}/docs/docs.yaml\n`);
for (const [path, usedBy] of USED) {
  const match = normalized.get(normalize(path));
  console.log(`${match ? "✓" : "✗"} ${path.padEnd(36)} ${usedBy.padEnd(28)} ${match ?? "NOT IN SPEC"}`);
  if (!match) missing++;
}
if (missing) {
  console.error(`\n${missing} path(s) missing from the spec — do not go live.`);
  process.exit(1);
}
console.log("\nall endpoint paths present in spec");
