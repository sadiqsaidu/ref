import { apiFetch } from "@/lib/txline/api";

export const dynamic = "force-dynamic";

type RawFixture = {
  FixtureId: number;
  Participant1: string;
  Participant2: string;
  Competition: string;
  StartTime: number;
};

const WC_FIRST_DAY = Math.floor(Date.UTC(2026, 5, 11) / 86_400_000);
const WC_LAST_DAY = Math.floor(Date.UTC(2026, 6, 19) / 86_400_000);
const WC = /world cup/i;
const NOT_WC = /wom|u-?1\d|u-?2\d|youth|futsal|beach/i;

let cache: { at: number; body: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 10 * 60_000) return Response.json(cache.body);

  const days: number[] = [];
  for (let d = WC_FIRST_DAY; d <= WC_LAST_DAY; d++) days.push(d);

  const byId = new Map<number, RawFixture>();
  let failures = 0;
  for (let i = 0; i < days.length; i += 6) {
    await Promise.all(
      days.slice(i, i + 6).map(async (day) => {
        try {
          const res = await apiFetch(`/fixtures/snapshot?startEpochDay=${day}`);
          for (const f of (await res.json()) as RawFixture[]) {
            if (WC.test(f.Competition) && !NOT_WC.test(f.Competition)) {
              byId.set(f.FixtureId, f);
            }
          }
        } catch {
          failures++;
        }
      }),
    );
  }

  const matches = [...byId.values()]
    .map((f) => ({
      id: String(f.FixtureId),
      p1: f.Participant1,
      p2: f.Participant2,
      competition: f.Competition,
      startTime: f.StartTime < 1e12 ? f.StartTime * 1000 : f.StartTime,
    }))
    .sort((a, b) => b.startTime - a.startTime);

  const body = { matches, complete: failures === 0 };
  if (matches.length > 0) cache = { at: Date.now(), body };
  return Response.json(body);
}
