import { apiFetch, parseRecords } from "@/lib/txline/api";
import { aggregatePlayers, createMapper, normalizeRaw, orderRecords } from "@/lib/txline/map";
import { eventKey } from "@/lib/eventKey";
import { reduce } from "@/lib/reduce";
import type { Players } from "@/lib/types";

export type MatchSummary = {
  id: string;
  teams: { 1: string; 2: string };
  score: { 1: number; 2: number };
  phase: string;
  keyEvents: { minute: number | null; team: 1 | 2 | null; kind: string; detail: string }[];
  players: Players;
};

const KEY = new Set(["goal", "red", "second_yellow", "var_end"]);
const cache = new Map<string, { at: number; summary: MatchSummary }>();

export async function getMatchSummary(id: string): Promise<MatchSummary | null> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.summary;
  try {
    const text = await apiFetch(`/scores/historical/${id}`).then((r) => r.text());
    const all = (parseRecords(text) as Record<string, unknown>[]).map(normalizeRaw);
    const header = all.find((r) => r.participant1 || r.Participant1);
    const teams = {
      1: String(header?.participant1 ?? header?.Participant1 ?? "Team A"),
      2: String(header?.participant2 ?? header?.Participant2 ?? "Team B"),
    };
    const records = orderRecords(all);
    const map = createMapper(true);
    const seen = new Set<string>();
    const events = records.flatMap((r) => map(r)).filter((e) => {
      const k = eventKey(e);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const state = reduce(events);
    const keyEvents = events
      .filter((e) => KEY.has(e.kind) && !(e.kind === "var_end" && !e.detail.includes("OVERTURNED")))
      .slice(-4)
      .reverse()
      .map((e) => ({ minute: e.minute, team: e.team, kind: e.kind, detail: e.detail }));
    const summary: MatchSummary = {
      id,
      teams,
      score: state.score,
      phase: state.phase,
      keyEvents,
      players: aggregatePlayers(records),
    };
    cache.set(id, { at: Date.now(), summary });
    return summary;
  } catch {
    return null;
  }
}
