import data from "../../data/baselines.json";

export type Baselines = {
  yellowsSplit: number[];
  foulsSplit: number[];
  varAgainstSplit: number[];
  disciplineSplit: number[];
};

export function loadBaselines(): Baselines {
  return data;
}
