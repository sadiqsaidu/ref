import { getMatchSummary } from "@/lib/matchSummary";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const summary = await getMatchSummary(id);
  if (!summary) return Response.json({ error: "unavailable" }, { status: 502 });
  return Response.json(summary);
}
