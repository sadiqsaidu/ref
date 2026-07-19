import { apiFetch } from "@/lib/txline/api";

export const dynamic = "force-dynamic";

type RawFixture = {
  FixtureId: number;
  Participant1: string;
  Participant2: string;
  Competition: string;
  StartTime: number;
};

let cache: { at: number; body: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 60_000) return Response.json(cache.body);
  const defaultFixtureId = process.env.TXLINE_FIXTURE_ID ?? null;
  try {
    const res = await apiFetch(
      `/fixtures/snapshot?startEpochDay=${Math.floor(Date.now() / 86_400_000)}`,
    );
    const raw = (await res.json()) as RawFixture[];
    const body = {
      defaultFixtureId,
      fixtures: raw
        .map((f) => ({
          id: String(f.FixtureId),
          p1: f.Participant1,
          p2: f.Participant2,
          competition: f.Competition,
          startTime: f.StartTime,
        }))
        .sort((a, b) => a.startTime - b.startTime),
    };
    cache = { at: Date.now(), body };
    return Response.json(body);
  } catch {
    return Response.json({ defaultFixtureId, fixtures: [] });
  }
}
