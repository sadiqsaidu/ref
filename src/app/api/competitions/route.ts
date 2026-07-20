import { scanFixtures } from "@/lib/txline/fixtures";

export const dynamic = "force-dynamic";

const priority = (name: string) => (/world cup/i.test(name) ? 0 : 1);

export async function GET() {
  const { matches } = await scanFixtures();
  const byComp = new Map<number, { id: number; name: string; count: number; lastStart: number }>();
  for (const m of matches) {
    const c = byComp.get(m.competitionId);
    if (c) {
      c.count++;
      c.lastStart = Math.max(c.lastStart, m.startTime);
    } else {
      byComp.set(m.competitionId, {
        id: m.competitionId,
        name: m.competition,
        count: 1,
        lastStart: m.startTime,
      });
    }
  }
  const competitions = [...byComp.values()].sort(
    (a, b) => priority(a.name) - priority(b.name) || b.lastStart - a.lastStart,
  );
  return Response.json({ competitions, default: competitions[0]?.id ?? null });
}
