function midpointRank(sorted: number[], value: number): number {
  let less = 0;
  let equal = 0;
  for (const v of sorted) {
    if (v < value) less++;
    else if (v === value) equal++;
  }
  return ((less + 0.5 * equal) / sorted.length) * 100;
}

export function percentile(sample: readonly number[], value: number): number {
  if (sample.length === 0) return 50;
  const sorted = [...sample].sort((a, b) => a - b);
  if (sorted.includes(value)) return midpointRank(sorted, value);
  if (value < sorted[0]) return 0;
  if (value > sorted[sorted.length - 1]) return 100;
  let i = 0;
  while (sorted[i + 1] < value) i++;
  const lower = sorted[i];
  const upper = sorted[i + 1];
  const t = (value - lower) / (upper - lower);
  return midpointRank(sorted, lower) + t * (midpointRank(sorted, upper) - midpointRank(sorted, lower));
}

export function tierFor(p: number): "within normal range" | "unusual" | "rare" {
  return p > 95 ? "rare" : p >= 80 ? "unusual" : "within normal range";
}

export function ordinal(n: number): string {
  const r = Math.round(n);
  const v = r % 100;
  if (v >= 11 && v <= 13) return `${r}th`;
  return `${r}${["th", "st", "nd", "rd"][r % 10] ?? "th"}`;
}
