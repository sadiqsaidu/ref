import type { RefEvent } from "./types";

export type TeamStats = {
  yellows: number;
  reds: number;
  foulsProxy: number;
  dangerFKs: number;
  corners: number;
  varFor: number;
  varAgainst: number;
  varOverturned: number;
};

export type MatchState = {
  phase: string;
  minute: number | null;
  score: { 1: number; 2: number };
  teams: { 1: TeamStats; 2: TeamStats };
  lastTs: number | null;
};

const emptyTeam = (): TeamStats => ({
  yellows: 0,
  reds: 0,
  foulsProxy: 0,
  dangerFKs: 0,
  corners: 0,
  varFor: 0,
  varAgainst: 0,
  varOverturned: 0,
});

export function reduce(events: RefEvent[]): MatchState {
  const s: MatchState = {
    phase: "NS",
    minute: null,
    score: { 1: 0, 2: 0 },
    teams: { 1: emptyTeam(), 2: emptyTeam() },
    lastTs: null,
  };
  // a disallowed goal arrives as var_end OVERTURNED and/or a stat rollback
  // (amend GOAL REMOVED); apply the deduction once whichever comes first
  const deducted = { 1: false, 2: false };
  const takeGoal = (team: 1 | 2) => {
    if (deducted[team]) {
      deducted[team] = false;
      return;
    }
    deducted[team] = true;
    s.score[team] = Math.max(0, s.score[team] - 1);
  };
  for (const e of events) {
    s.lastTs = e.ts;
    s.phase = e.phase;
    if (e.minute !== null) s.minute = e.minute;
    if (!e.team) continue;
    const team = s.teams[e.team];
    const other = s.teams[e.team === 1 ? 2 : 1];
    switch (e.kind) {
      case "goal":
        deducted[e.team] = false;
        s.score[e.team]++;
        break;
      case "yellow":
        team.yellows++;
        break;
      case "second_yellow":
        team.yellows++;
        team.reds++;
        break;
      case "red":
        team.reds++;
        break;
      case "corner":
        team.corners++;
        break;
      case "free_kick":
        other.foulsProxy++;
        if (e.detail.includes("DANGER")) team.dangerFKs++;
        break;
      case "offside":
        other.foulsProxy++;
        break;
      case "var_start":
        team.varAgainst++;
        other.varFor++;
        break;
      case "var_end":
        if (e.detail.includes("OVERTURNED")) {
          team.varOverturned++;
          if (e.detail.startsWith("GOAL")) takeGoal(e.team);
        }
        break;
      case "amend":
        if (e.detail === "GOAL REMOVED") takeGoal(e.team);
        break;
    }
  }
  return s;
}
