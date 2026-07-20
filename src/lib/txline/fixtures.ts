import { apiFetch } from "./api";

export type RawFixture = {
  FixtureId: number;
  Participant1: string;
  Participant2: string;
  Competition: string;
  CompetitionId: number;
  StartTime: number;
};

export type Match = {
  id: string;
  p1: string;
  p2: string;
  competition: string;
  competitionId: number;
  startTime: number;
};

// youth / women / futsal variants share a base competition name; keep the main feed
const EXCLUDE = /wom|u-?1\d|u-?2\d|youth|futsal|beach|reserve/i;
const DAY = 86_400_000;

let cache: { at: number; matches: Match[]; complete: boolean } | null = null;

// scan a rolling window of fixture snapshots once, shared by all fixture routes
export async function scanFixtures(): Promise<{ matches: Match[]; complete: boolean }> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache;

  const today = Math.floor(Date.now() / DAY);
  const days: number[] = [];
  for (let d = today - 45; d <= today + 14; d++) days.push(d);

  const byId = new Map<number, RawFixture>();
  let failures = 0;
  for (let i = 0; i < days.length; i += 6) {
    await Promise.all(
      days.slice(i, i + 6).map(async (day) => {
        try {
          const res = await apiFetch(`/fixtures/snapshot?startEpochDay=${day}`);
          for (const f of (await res.json()) as RawFixture[]) {
            if (!EXCLUDE.test(f.Competition)) byId.set(f.FixtureId, f);
          }
        } catch {
          failures++;
        }
      }),
    );
  }

  const matches: Match[] = [...byId.values()]
    .map((f) => ({
      id: String(f.FixtureId),
      p1: f.Participant1,
      p2: f.Participant2,
      competition: f.Competition,
      competitionId: f.CompetitionId,
      startTime: f.StartTime < 1e12 ? f.StartTime * 1000 : f.StartTime,
    }))
    .sort((a, b) => b.startTime - a.startTime);

  const result = { matches, complete: failures === 0 };
  if (matches.length > 0) cache = { at: Date.now(), ...result };
  return result;
}
