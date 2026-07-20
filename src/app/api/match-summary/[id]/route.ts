import { apiFetch, parseRecords } from "@/lib/txline/api";
import { aggregatePlayers, createMapper, normalizeRaw } from "@/lib/txline/map";
import { reduce } from "@/lib/reduce";
import type { RawScore } from "@/lib/types";

export const dynamic = "force-dynamic";

const KEY = new Set(["goal", "red", "second_yellow", "var_end"]);

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const text = await apiFetch(`/scores/historical/${id}`).then((r) => r.text());
    const all = (parseRecords(text) as Record<string, unknown>[]).map(normalizeRaw);
    const header = all.find((r) => r.participant1 || r.Participant1);
    const teams = {
      1: String(header?.participant1 ?? header?.Participant1 ?? "Team A"),
      2: String(header?.participant2 ?? header?.Participant2 ?? "Team B"),
    };
    const records = all
      .filter((r) => typeof r.seq === "number")
      .sort((a, b) => a.seq - b.seq) as RawScore[];
    const map = createMapper(true);
    const events = records.flatMap((r) => map(r));
    const state = reduce(events);
    const keyEvents = events
      .filter((e) => KEY.has(e.kind) && !(e.kind === "var_end" && !e.detail.includes("OVERTURNED")))
      .slice(-4)
      .reverse()
      .map((e) => ({ minute: e.minute, team: e.team, kind: e.kind, detail: e.detail }));
    return Response.json({
      id,
      teams,
      score: state.score,
      phase: state.phase,
      keyEvents,
      players: aggregatePlayers(records),
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unavailable" },
      { status: 502 },
    );
  }
}
