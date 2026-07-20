import type { OddsTick } from "./odds";
import type { RefEvent, RefKind } from "./types";

const WINDOW = 60_000;

export type Impact = {
  id: string;
  minute: number | null;
  kind: RefKind;
  label: string;
  team: 1 | 2 | null;
  delta: number; // signed points, affected team's win probability
};

export function isMajor(e: RefEvent): boolean {
  if (e.kind === "var_end") return e.detail.includes("OVERTURNED");
  return (
    e.kind === "goal" ||
    e.kind === "red" ||
    e.kind === "second_yellow" ||
    e.kind === "penalty_awarded"
  );
}

function labelFor(e: RefEvent): string {
  switch (e.kind) {
    case "goal":
      return e.detail === "PENALTY" ? "GOAL · PENALTY" : "GOAL";
    case "red":
      return "RED CARD";
    case "second_yellow":
      return "SECOND YELLOW";
    case "penalty_awarded":
      return "PENALTY";
    case "var_end":
      return "VAR OVERTURNED";
    default:
      return e.detail;
  }
}

function probAt(series: OddsTick[], ts: number, team: 1 | 2): number | null {
  if (series.length === 0) return null;
  let best = series[0];
  let bestD = Math.abs(series[0].ts - ts);
  for (const t of series) {
    const d = Math.abs(t.ts - ts);
    if (d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return team === 1 ? best.pA : best.pB;
}

export function computeImpacts(events: RefEvent[], series: OddsTick[]): Impact[] {
  if (series.length < 2) return [];
  const t0 = series[0].ts;
  const t1 = series[series.length - 1].ts;
  const out: Impact[] = [];
  for (const e of events) {
    if (!isMajor(e) || !e.team) continue;
    const before = probAt(series, Math.max(t0, e.ts - WINDOW), e.team);
    const after = probAt(series, Math.min(t1, e.ts + WINDOW), e.team);
    if (before === null || after === null) continue;
    out.push({
      id: e.id,
      minute: e.minute,
      kind: e.kind,
      label: labelFor(e),
      team: e.team,
      delta: (after - before) * 100,
    });
  }
  return out;
}

// true only when consensus repriced AFTER each significant decision, not before
// (pre-decision drift stays flat relative to the post move). Never accusatory.
export function integrityHolds(events: RefEvent[], series: OddsTick[]): boolean {
  if (series.length < 3) return false;
  const t0 = series[0].ts;
  const significant = computeImpacts(events, series).filter(
    (i) => Math.abs(i.delta) >= 3,
  );
  if (significant.length === 0) return false;
  for (const i of significant) {
    const e = events.find((x) => x.id === i.id);
    if (!e || !i.team) continue;
    const preStart = probAt(series, Math.max(t0, e.ts - 2 * WINDOW), i.team);
    const preEnd = probAt(series, Math.max(t0, e.ts - WINDOW), i.team);
    if (preStart === null || preEnd === null) continue;
    const preMove = Math.abs(preEnd - preStart) * 100;
    if (preMove > 0.4 * Math.abs(i.delta)) return false;
  }
  return true;
}
