export type OddsTick = {
  ts: number;
  minute: number;
  pA: number;
  pDraw: number;
  pB: number;
};

export const ODDS_CAP = 2000;

// decimal odds → de-vigged implied win probabilities
export function normalizeOdds(
  oddsA: number,
  oddsDraw: number | null,
  oddsB: number,
  ts: number,
  minute: number,
): OddsTick | null {
  if (!(oddsA > 1) || !(oddsB > 1)) return null;
  if (oddsDraw !== null && !(oddsDraw > 1)) return null;
  const rA = 1 / oddsA;
  const rB = 1 / oddsB;
  const rD = oddsDraw !== null ? 1 / oddsDraw : 0;
  const sum = rA + rB + rD;
  if (sum <= 0) return null;
  return { ts, minute, pA: rA / sum, pDraw: rD / sum, pB: rB / sum };
}
