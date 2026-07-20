import type { RawScore, RefEvent, RefKind } from "../types";

const PHASES: Record<number, string> = {
  1: "NS", 2: "H1", 3: "HT", 4: "H2", 5: "F", 6: "WET", 7: "ET1", 8: "HTET",
  9: "ET2", 10: "FET", 11: "WPE", 12: "PE", 13: "FPE", 14: "I", 15: "A", 16: "C",
  17: "P17", 18: "P18", 19: "P19",
};

const PHASE_BASE: Record<string, number> = { H1: 0, H2: 45, ET1: 90, ET2: 105 };
const PHASE_FROZEN: Record<string, number> = {
  HT: 45, F: 90, WET: 90, HTET: 105, FET: 120, WPE: 120, PE: 120, FPE: 120,
};

const ACTION_KINDS: Record<string, RefKind> = {
  goal: "goal",
  yellow: "yellow",
  yellow_card: "yellow",
  red: "red",
  red_card: "red",
  second_yellow: "second_yellow",
  second_yellow_card: "second_yellow",
  corner: "corner",
  corner_kick: "corner",
  var: "var_start",
  var_start: "var_start",
  var_end: "var_end",
  free_kick: "free_kick",
  offside: "offside",
  penalty: "penalty_awarded",
  penalty_awarded: "penalty_awarded",
  penalty_outcome: "penalty_outcome",
  penalty_shot: "penalty_outcome",
  amend: "amend",
  amendment: "amend",
};

// stat key = period_prefix + base; bases 1..8 pair up as team1/team2 counters
const BASE_KINDS: Record<number, RefKind> = {
  1: "goal", 2: "goal", 3: "yellow", 4: "yellow",
  5: "red", 6: "red", 7: "corner", 8: "corner",
};

const KIND_LABELS: Partial<Record<RefKind, string>> = {
  goal: "GOAL",
  yellow: "YELLOW CARD",
  red: "RED CARD",
  second_yellow: "SECOND YELLOW",
  corner: "CORNER",
  penalty_awarded: "PENALTY AWARDED",
  amend: "CORRECTION",
};

const toMs = (t: number) => (t < 1e12 ? t * 1000 : t);

// feed records appear in camelCase or PascalCase depending on endpoint
export function normalizeRaw(raw: Record<string, unknown>): RawScore {
  if (raw.seq !== undefined || raw.ts !== undefined) return raw as RawScore;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k === "Data" || k === "PlayerStats" ? k : k.charAt(0).toLowerCase() + k.slice(1)] = v;
  }
  return out as RawScore;
}

type Delta = { base: number; delta: number };

export function createMapper() {
  let phase = "NS";
  let phaseStart = 0;
  const stats: Record<string, number> = {};
  let pendingVar: { type: string; team: 1 | 2 | null } | null = null;

  function minuteAt(raw: RawScore): number | null {
    if (typeof raw.minute === "number") return raw.minute;
    if (phase in PHASE_BASE) {
      return PHASE_BASE[phase] + Math.floor((toMs(raw.ts) - phaseStart) / 60000) + 1;
    }
    return PHASE_FROZEN[phase] ?? null;
  }

  function diff(raw: RawScore): Delta[] {
    const out: Delta[] = [];
    if (!raw.stats) return out;
    let hasTotal = false;
    for (const [key, val] of Object.entries(raw.stats)) {
      const k = Number(key);
      const prev = stats[key] ?? 0;
      stats[key] = val;
      const base = k < 1000 ? k : k % 1000;
      if (val === prev || !(base in BASE_KINDS) || (k >= 6000 && k < 7000)) continue;
      if (k < 1000) hasTotal = true;
      out.push({ base: k < 1000 ? -k : base, delta: val - prev });
    }
    // totals and period keys report the same increment; prefer totals when present
    return out
      .filter((d) => (hasTotal ? d.base < 0 : true))
      .map((d) => ({ base: Math.abs(d.base), delta: d.delta }));
  }

  return function map(input: RawScore): RefEvent[] {
    const raw = normalizeRaw(input);
    const out: RefEvent[] = [];
    const ts = toMs(raw.ts);
    const baseId = String(raw.seq ?? raw.id ?? ts);
    const team =
      raw.participant === 1 || raw.participant === 2 ? raw.participant : null;

    const push = (kind: RefKind, detail: string, t: 1 | 2 | null = team) =>
      out.push({
        id: out.length === 0 ? baseId : `${baseId}.${out.length}`,
        ts,
        minute: minuteAt(raw),
        phase,
        team: t,
        kind,
        detail,
        verify: { status: "pending" },
      });

    if (raw.action === "game_finalised") {
      phase = "F";
      diff(raw);
      push("phase_change", "FINALISED", null);
      return out;
    }

    if (raw.statusId && PHASES[raw.statusId] && PHASES[raw.statusId] !== phase) {
      phase = PHASES[raw.statusId];
      phaseStart = ts;
      push("phase_change", phase, null);
    }

    const deltas = diff(raw);
    const kind = raw.action ? ACTION_KINDS[raw.action.toLowerCase()] : undefined;

    if (kind === "free_kick") {
      const fk = raw.Data?.FreeKickType;
      if (fk === "Offside") push("offside", "OFFSIDE");
      else push("free_kick", fk ? fk.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase() : "FREE KICK");
    } else if (kind === "offside") {
      push("offside", "OFFSIDE");
    } else if (kind === "var_start") {
      const type = String(raw.Data?.Type ?? "Review");
      pendingVar = { type, team };
      push("var_start", `VAR · ${type.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase()}`);
    } else if (kind === "var_end") {
      const outcome = String(raw.Data?.Outcome ?? "").toUpperCase();
      const type = (pendingVar?.type ?? "Review").replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase();
      push("var_end", `${type} · ${outcome}`, team ?? pendingVar?.team ?? null);
      pendingVar = null;
    } else if (kind === "penalty_outcome") {
      const outcome = String(raw.Data?.Outcome ?? "").toUpperCase();
      push("penalty_outcome", outcome || "PENALTY");
      if (outcome === "SCORED" && deltas.some((d) => d.delta > 0 && d.base <= 2)) {
        push("goal", "PENALTY");
      }
    } else if (kind) {
      const t = team ?? teamFromDeltas(deltas, kind);
      push(kind, KIND_LABELS[kind] ?? kind.toUpperCase(), t);
    } else {
      for (const d of deltas) {
        const dTeam = (d.base % 2 === 1 ? 1 : 2) as 1 | 2;
        if (d.delta > 0) push(BASE_KINDS[d.base], KIND_LABELS[BASE_KINDS[d.base]] ?? "", dTeam);
        else push("amend", `${KIND_LABELS[BASE_KINDS[d.base]]} REMOVED`, dTeam);
      }
    }
    return out;
  };
}

function teamFromDeltas(deltas: Delta[], kind: RefKind): 1 | 2 | null {
  const d = deltas.find((x) => BASE_KINDS[x.base] === kind && x.delta > 0);
  return d ? ((d.base % 2 === 1 ? 1 : 2) as 1 | 2) : null;
}
