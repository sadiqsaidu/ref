import { scanFixtures } from "@/lib/txline/fixtures";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const competitionId = new URL(req.url).searchParams.get("competition");
  const { matches, complete } = await scanFixtures();
  const filtered = competitionId
    ? matches.filter((m) => String(m.competitionId) === competitionId)
    : matches;
  return Response.json({ matches: filtered, complete });
}
