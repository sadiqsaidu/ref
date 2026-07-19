import type { MatchSource, RawScore } from "../types";
import { playRaw } from "./play";

type Step = [
  offsetSec: number,
  minute: number,
  patch: Partial<RawScore> & { action?: string },
];

const SCRIPT: Step[] = [
  [0, 1, { statusId: 2 }],
  [35, 7, { action: "free_kick", participant: 2, Data: { FreeKickType: "Danger" } }],
  [70, 14, { action: "goal", participant: 1, stats: { "1": 1, "1001": 1 } }],
  [110, 23, { action: "yellow_card", participant: 2, stats: { "4": 1, "1004": 1 } }],
  [150, 31, { action: "free_kick", participant: 1, Data: { FreeKickType: "HighDanger" } }],
  [185, 38, { action: "corner", participant: 2, stats: { "8": 1, "1008": 1 } }],
  [215, 44, { action: "yellow_card", participant: 1, stats: { "3": 1, "1003": 1 } }],
  [240, 45, { statusId: 3 }],
  [260, 46, { statusId: 4 }],
  [275, 52, { action: "free_kick", participant: 1, Data: { FreeKickType: "Offside" } }],
  [290, 58, { action: "goal", participant: 2, stats: { "1": 1, "2": 1, "3002": 1 } }],
  [305, 59, { action: "var", participant: 2, Data: { Type: "Goal" } }],
  [340, 61, { action: "var_end", participant: 2, Data: { Outcome: "Overturned" } }],
  [345, 61, { action: "amend", participant: 2, stats: { "2": 0, "3002": 0 } }],
  [370, 73, { action: "red_card", participant: 2, stats: { "6": 1, "3006": 1 } }],
  [400, 81, { action: "penalty", participant: 1 }],
  [420, 82, { action: "penalty_outcome", participant: 1, Data: { Outcome: "Scored" }, stats: { "1": 2, "3001": 1 } }],
  [450, 88, { action: "free_kick", participant: 2, Data: { FreeKickType: "Attack" } }],
  [470, 90, { statusId: 5 }],
  [478, 90, { action: "game_finalised", statusId: 100, period: 100 }],
];

export function mockSource(speed: number): MatchSource {
  const base = Date.now();
  const messages: RawScore[] = SCRIPT.map(([offset, minute, patch], i) => ({
    fixtureId: 0,
    ts: base + offset * 1000,
    seq: i + 1,
    minute,
    ...patch,
  }));
  return playRaw(messages, speed);
}
