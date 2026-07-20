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

const STAT_KINDS: RefKind[] = ["goal", "yellow", "red", "second_yellow", "corner"];

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
const spaced = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase();

const NUMERIC_FIELDS = [
  "seq", "ts", "statusId", "participant", "minute", "period", "id", "startTime",
] as const;

// feed records appear in camelCase or PascalCase depending on endpoint, and
// numeric fields (including stat values) sometimes arrive as strings
export function normalizeRaw(raw: Record<string, unknown>): RawScore {
  let out: Record<string, unknown>;
  if (raw.seq !== undefined || raw.ts !== undefined) {
    out = { ...raw };
  } else {
    out = {};
    for (const [k, v] of Object.entries(raw)) {
      out[k === "Data" || k === "PlayerStats" ? k : k.charAt(0).toLowerCase() + k.slice(1)] = v;
    }
  }
  for (const f of NUMERIC_FIELDS) {
    if (typeof out[f] === "string") {
      const n = Number(out[f]);
      if (Number.isFinite(n)) out[f] = n;
    }
  }
  return out as RawScore;
}

type Delta = { base: number; delta: number };

export function createMapper() {
  let phase = "NS";
  let phaseStart = 0;
  // the same increment is reported under the total key, under period keys, and
  // in re-sent records; one cumulative counter per base dedupes all of them
  const totals: Record<number, number> = {};
  const periodVals: Record<number, Record<number, number>> = {};
  const counts: Record<number, number> = {};
  const seenActions = new Set<string>();
  let pendingVar: { type: string; team: 1 | 2 | null } | null = null;
  let lastFk: { team: 1 | 2 | null; minute: number | null } | null = null;

  function minuteAt(raw: RawScore): number | null {
    if (typeof raw.minute === "number") return raw.minute;
    if (phase in PHASE_BASE) {
      return PHASE_BASE[phase] + Math.floor((toMs(raw.ts) - phaseStart) / 60000) + 1;
    }
    return PHASE_FROZEN[phase] ?? null;
  }

  function applyStats(raw: RawScore): Delta[] {
    if (!raw.stats) return [];
    for (const [key, rawVal] of Object.entries(raw.stats)) {
      const k = Number(key);
      const val = Number(rawVal);
      if (!Number.isFinite(k) || !Number.isFinite(val)) continue;
      const base = k < 1000 ? k : k % 1000;
      const prefix = k - base;
      if (!(base in BASE_KINDS) || prefix === 6000) continue;
      if (prefix === 0) totals[base] = val;
      else (periodVals[base] ??= {})[prefix] = val;
    }
    const out: Delta[] = [];
    for (const b of Object.keys(BASE_KINDS)) {
      const base = Number(b);
      const periodSum = Object.values(periodVals[base] ?? {}).reduce((a, v) => a + v, 0);
      const next = Math.max(totals[base] ?? 0, periodSum);
      const prev = counts[base] ?? 0;
      if (next !== prev) {
        counts[base] = next;
        out.push({ base, delta: next - prev });
      }
    }
    return out;
  }

  return function map(input: RawScore): RefEvent[] {
    const raw = normalizeRaw(input);
    if (raw.coverageSecondaryData === true) return [];
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
      applyStats(raw);
      push("phase_change", "FINALISED", null);
      return out;
    }

    if (raw.statusId && PHASES[raw.statusId] && PHASES[raw.statusId] !== phase) {
      phase = PHASES[raw.statusId];
      phaseStart = ts;
      push("phase_change", phase, null);
    }

    const deltas = applyStats(raw);
    const kind = raw.action ? ACTION_KINDS[raw.action.toLowerCase()] : undefined;
    const minute = minuteAt(raw);

    const emitDeltas = (skip?: (d: Delta) => boolean) => {
      for (const d of deltas) {
        if (d.delta === 0 || skip?.(d)) continue;
        const t = (d.base % 2 === 1 ? 1 : 2) as 1 | 2;
        const k = BASE_KINDS[d.base];
        if (d.delta > 0) {
          for (let i = 0; i < d.delta; i++) push(k, KIND_LABELS[k] ?? "", t);
        } else {
          push("amend", `${KIND_LABELS[k]} REMOVED`, t);
        }
      }
    };

    if (kind && STAT_KINDS.includes(kind)) {
      const bookedTeam = team ?? teamFromDeltas(deltas, kind);
      if (kind === "second_yellow" && deltas.some((d) => d.delta > 0)) {
        push("second_yellow", KIND_LABELS.second_yellow ?? "", bookedTeam);
        emitDeltas(
          (d) =>
            d.delta > 0 &&
            (BASE_KINDS[d.base] === "yellow" || BASE_KINDS[d.base] === "red") &&
            (d.base % 2 === 1 ? 1 : 2) === bookedTeam,
        );
      } else {
        emitDeltas();
      }
    } else if (kind === "free_kick" || kind === "offside") {
      const fk = raw.Data?.FreeKickType;
      const isOffside = kind === "offside" || fk === "Offside";
      // typeless records re-report the kick already announced with a type
      const dup =
        !fk && lastFk !== null && lastFk.team === team && lastFk.minute === minute;
      lastFk = { team, minute };
      if (isOffside) push("offside", "OFFSIDE");
      else if (!dup) push("free_kick", fk ? spaced(fk) : "FREE KICK");
      emitDeltas();
    } else if (kind) {
      const actionKey = raw.id !== undefined ? `${raw.id}:${kind}` : null;
      const dup = actionKey !== null && seenActions.has(actionKey);
      if (actionKey) seenActions.add(actionKey);
      if (!dup) {
        if (kind === "var_start") {
          const type = String(raw.Data?.Type ?? "Review");
          pendingVar = { type, team };
          push("var_start", `VAR · ${spaced(type)}`);
        } else if (kind === "var_end") {
          const outcome = String(raw.Data?.Outcome ?? "").toUpperCase();
          const type = spaced(pendingVar?.type ?? "Review");
          push("var_end", `${type} · ${outcome}`, team ?? pendingVar?.team ?? null);
          pendingVar = null;
        } else if (kind === "penalty_outcome") {
          const outcome = String(raw.Data?.Outcome ?? "").toUpperCase();
          push("penalty_outcome", outcome || "PENALTY");
          const gd = deltas.find((d) => (d.base === 1 || d.base === 2) && d.delta > 0);
          if (outcome === "SCORED" && gd) {
            push("goal", "PENALTY", (d => (d.base === 1 ? 1 : 2) as 1 | 2)(gd));
            gd.delta--;
          }
        } else if (kind !== "amend" || deltas.every((d) => d.delta === 0)) {
          push(kind, KIND_LABELS[kind] ?? kind.toUpperCase(), team);
        }
      }
      emitDeltas();
    } else {
      emitDeltas();
    }
    return out;
  };
}

function teamFromDeltas(deltas: Delta[], kind: RefKind): 1 | 2 | null {
  const wanted: RefKind = kind === "second_yellow" ? "yellow" : kind;
  const d = deltas.find((x) => BASE_KINDS[x.base] === wanted && x.delta > 0);
  return d ? ((d.base % 2 === 1 ? 1 : 2) as 1 | 2) : null;
}
