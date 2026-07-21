import type { OddsTick } from "./odds";
import type { RefEvent } from "./types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shiftFor(e: RefEvent): { dA: number; dDraw: number; dB: number } | null {
  const s = e.team === 1 ? 1 : -1;
  switch (e.kind) {
    case "goal":
      return e.team === 1
        ? { dA: 0.17, dDraw: -0.07, dB: -0.1 }
        : { dA: -0.1, dDraw: -0.07, dB: 0.17 };
    case "red":
    case "second_yellow":
      return { dA: -0.12 * s, dDraw: 0.04, dB: 0.12 * s };
    case "penalty_awarded":
      return { dA: 0.06 * s, dDraw: -0.02, dB: -0.06 * s };
    case "var_end":
      return e.detail.includes("OVERTURNED")
        ? e.team === 1
          ? { dA: -0.15, dDraw: 0.06, dB: 0.09 }
          : { dA: 0.09, dDraw: 0.06, dB: -0.15 }
        : null;
    default:
      return null;
  }
}

const MIN = 60_000;

// Demo-only simulated consensus walk, derived from the match's real decisions.
// Pure & client-side — used only when demo mode is on, clearly badged SIMULATED.
export function simulateOdds(events: RefEvent[]): OddsTick[] {
  if (events.length === 0) return [];
  const rand = mulberry32(Math.round(events[0].ts) || 1);
  let pA = 0.42;
  let pDraw = 0.28;
  let pB = 0.3;
  let lastMinute = -1;
  let lastTs = 0;
  const out: OddsTick[] = [];

  const renorm = () => {
    pA = Math.min(0.96, Math.max(0.02, pA));
    pB = Math.min(0.96, Math.max(0.02, pB));
    pDraw = Math.min(0.96, Math.max(0.02, pDraw));
    const sum = pA + pDraw + pB;
    pA /= sum;
    pDraw /= sum;
    pB /= sum;
  };
  const drift = () => {
    pA += (rand() - 0.5) * 0.012;
    pB += (rand() - 0.5) * 0.012;
    renorm();
  };
  const push = (ts: number, minute: number) => out.push({ ts, minute, pA, pDraw, pB });

  for (const e of events) {
    const minute = Math.max(0, e.minute ?? Math.max(0, lastMinute));
    if (lastMinute < 0) {
      const startTs = e.ts - minute * MIN;
      push(startTs, 0);
      lastMinute = 0;
      lastTs = startTs;
    }
    const span = Math.max(1, minute - lastMinute);
    for (let m = lastMinute + 1; m <= minute; m++) {
      drift();
      push(lastTs + ((e.ts - lastTs) * (m - lastMinute)) / span, m);
    }
    lastMinute = Math.max(lastMinute, minute);
    lastTs = e.ts;

    const shift = shiftFor(e);
    if (shift) {
      pA += shift.dA;
      pDraw += shift.dDraw;
      pB += shift.dB;
      renorm();
      lastTs = e.ts + MIN;
      lastMinute = minute + 1;
      push(lastTs, lastMinute);
    }
    if (e.kind === "phase_change" && e.detail === "FINALISED") {
      const end = lastMinute >= 91 ? 120 : 90;
      for (let m = lastMinute + 1; m <= end; m++) {
        drift();
        lastTs += MIN;
        push(lastTs, m);
      }
      lastMinute = end;
    }
  }
  return out;
}
