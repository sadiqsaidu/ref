export type RefKind =
  | "goal"
  | "yellow"
  | "red"
  | "second_yellow"
  | "penalty_awarded"
  | "penalty_outcome"
  | "var_start"
  | "var_end"
  | "offside"
  | "free_kick"
  | "amend"
  | "phase_change"
  | "corner";

export type Verify = {
  status: "pending" | "anchored" | "failed";
  ref?: string;
};

export type RefEvent = {
  id: string;
  ts: number;
  minute: number | null;
  phase: string;
  team: 1 | 2 | null;
  kind: RefKind;
  detail: string;
  verify: Verify;
};

export type RawScore = {
  fixtureId?: number;
  action?: string;
  id?: number;
  ts: number;
  seq: number;
  statusId?: number;
  period?: number;
  participant?: number;
  minute?: number;
  startTime?: number;
  gameState?: string;
  confirmed?: boolean;
  stats?: Record<string, number>;
  Data?: {
    Type?: string;
    Outcome?: string;
    FreeKickType?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};

export type MatchSource = {
  subscribe(
    cb: (e: RefEvent) => void,
    onStatus?: (up: boolean) => void,
    onError?: (message: string) => void,
  ): void;
  close(): void;
};
