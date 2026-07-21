"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import type { TeamMeta } from "@/components/Dashboard";
import AiAnalyst, { type AnalystContext } from "@/components/AiAnalyst";
import Flag from "@/components/Flag";
import MarketPulse from "@/components/MarketPulse";
import type { OddsTick } from "@/lib/odds";
import { loadBaselines } from "@/lib/baselines";
import { ordinal, percentile, tierFor } from "@/lib/percentile";
import type { MatchState } from "@/lib/reduce";
import type { Players, RefEvent, RefKind } from "@/lib/types";

function useCountUp(target: number, reduced: boolean): number {
  const [value, setValue] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (reduced || from === target) {
      setValue(target);
      return;
    }
    const t0 = performance.now();
    let raf = requestAnimationFrame(function step(t) {
      const k = Math.min((t - t0) / 300, 1);
      setValue(Math.round(from + (target - from) * k));
      if (k < 1) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);
  return value;
}

const MirrorRow = memo(function MirrorRow({
  label,
  a,
  b,
  max,
  reduced,
}: {
  label: string;
  a: number;
  b: number;
  max: number;
  reduced: boolean;
}) {
  const av = useCountUp(a, reduced);
  const bv = useCountUp(b, reduced);
  const gid = useId();
  const wA = (a / max) * 48;
  const wB = (b / max) * 48;
  const spring = reduced
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.3, bounce: 0.15 };
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-right text-sm tabular-nums text-amber">{av}</span>
        <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="h-2 w-full">
          <defs>
            <linearGradient id={`${gid}a`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--yellow)" />
              <stop offset="1" stopColor="var(--amber)" />
            </linearGradient>
            <linearGradient id={`${gid}b`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--blue)" />
              <stop offset="1" stopColor="#7cc4ff" />
            </linearGradient>
          </defs>
          <motion.rect
            y="1"
            height="8"
            fill={`url(#${gid}a)`}
            animate={{ x: 50 - wA, width: wA }}
            transition={spring}
          />
          <motion.rect
            x="50"
            y="1"
            height="8"
            fill={`url(#${gid}b)`}
            animate={{ width: wB }}
            transition={spring}
          />
          <line x1="50" y1="0" x2="50" y2="10" stroke="var(--muted)" strokeWidth="0.5" />
        </svg>
        <span className="w-6 shrink-0 text-sm tabular-nums text-blue">{bv}</span>
      </div>
    </div>
  );
});

function Digit({ value, color }: { value: number; color: string }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <span className="relative inline-block overflow-hidden align-bottom" style={{ color }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="inline-block tabular-nums"
          initial={reduced ? false : { y: "-100%" }}
          animate={{ y: 0 }}
          exit={reduced ? undefined : { y: "100%" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const TICK_COLORS: Partial<Record<RefKind, string>> = {
  goal: "var(--green)",
  red: "var(--red)",
  second_yellow: "var(--red)",
  penalty_awarded: "var(--red)",
  penalty_outcome: "var(--red)",
  yellow: "var(--yellow)",
};

const PX_PER_MIN = 11;

function Timeline({
  events,
  onHighlight,
  highlightId,
  playhead,
}: {
  events: RefEvent[];
  onHighlight: (id: string | null) => void;
  highlightId: string | null;
  playhead?: number;
}) {
  const plotted = events.filter(
    (e) => e.minute !== null && e.kind !== "phase_change" && e.kind !== "var_end",
  );
  const maxMin = plotted.some((e) => (e.minute ?? 0) > 90) ? 120 : 90;
  const pad = 8;
  const w = pad * 2 + maxMin * PX_PER_MIN;
  const H = 34;
  const x = (m: number) => pad + Math.min(m, maxMin) * PX_PER_MIN;

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={H} className="block">
        <line x1={pad} y1={H / 2} x2={w - pad} y2={H / 2} stroke="var(--border)" />
        {Array.from({ length: maxMin / 15 + 1 }, (_, i) => i * 15).map((m) => (
          <g key={m}>
            <line x1={x(m)} y1={H / 2 - 4} x2={x(m)} y2={H / 2 + 4} stroke="var(--muted)" strokeWidth="0.75" />
            <text x={x(m)} y={H - 1} textAnchor="middle" className="fill-muted" style={{ fontSize: 8 }}>
              {m}&apos;
            </text>
          </g>
        ))}
        {playhead !== undefined && (
          <motion.line
            x1={x(playhead)}
            y1="2"
            x2={x(playhead)}
            y2={H - 8}
            stroke="var(--green)"
            strokeWidth="1.5"
            animate={{ x: 0 }}
          />
        )}
        {plotted.map((e) => {
          const hit = e.id === highlightId;
          const cx = x(e.minute!);
          const color =
            e.kind === "var_start" ? "var(--amber)" : TICK_COLORS[e.kind] ?? "var(--muted)";
          return (
            <g
              key={e.id}
              className="cursor-pointer"
              onMouseEnter={() => onHighlight(e.id)}
              onMouseLeave={() => onHighlight(null)}
              onClick={() => onHighlight(e.id)}
            >
              {e.kind === "var_start" ? (
                <path
                  d={`M ${cx} 5 L ${cx + 4} ${H / 2} L ${cx} ${H - 10} L ${cx - 4} ${H / 2} Z`}
                  fill={hit ? color : "none"}
                  stroke={color}
                  strokeWidth={hit ? 1.5 : 1}
                />
              ) : (
                <line
                  x1={cx}
                  y1={hit ? 3 : 6}
                  x2={cx}
                  y2={hit ? H - 8 : H - 12}
                  stroke={color}
                  strokeWidth={hit ? 3 : 1.75}
                />
              )}
              <rect x={cx - 5} y="0" width="10" height={H} fill="transparent" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const TIER_COLORS = {
  "within normal range": "var(--green)",
  unusual: "var(--amber)",
  rare: "var(--red)",
};

// plain-language comparison against tournament baselines, with a visual meter
function BaselineRow({
  label,
  value,
  sample,
  reduced,
}: {
  label: string;
  value: number;
  sample: number[];
  reduced: boolean;
}) {
  const p = percentile(sample, value);
  const tier = tierFor(p);
  const color = TIER_COLORS[tier];
  const rounded = Math.round(p);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs">
          <span className="font-bold tabular-nums">{value}</span>{" "}
          <span className="text-muted">{label}</span>
        </span>
        <span className="label" style={{ color }}>
          {tier}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div className="absolute inset-0 flex">
          <div className="h-full" style={{ width: "80%", background: "color-mix(in srgb, var(--green) 30%, transparent)" }} />
          <div className="h-full" style={{ width: "15%", background: "color-mix(in srgb, var(--amber) 35%, transparent)" }} />
          <div className="h-full" style={{ width: "5%", background: "color-mix(in srgb, var(--red) 40%, transparent)" }} />
        </div>
        <motion.div
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg"
          style={{ background: color }}
          initial={reduced ? false : { left: 0 }}
          animate={{ left: `${Math.min(98, Math.max(2, p))}%` }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
        />
      </div>
      <p className="label mt-1 !normal-case !tracking-normal">
        higher than {rounded}% of World Cup matches
      </p>
    </div>
  );
}

function Section({ accent, title }: { accent: string; title: string }) {
  return (
    <div className="label mb-2 flex items-center gap-1.5">
      <span className="size-1.5" style={{ background: accent }} />
      {title}
    </div>
  );
}

export default function Fairness({
  state,
  events,
  onHighlight,
  teams,
  players,
  highlightId,
  kickoff,
  matchKey,
  oddsSeries,
  oddsSimulated,
  replayActive,
  replayFrac,
  replay,
}: {
  state: MatchState;
  events: RefEvent[];
  onHighlight: (id: string | null) => void;
  teams: TeamMeta;
  players: Players;
  highlightId?: string | null;
  kickoff?: number;
  matchKey?: string;
  oddsSeries: OddsTick[];
  oddsSimulated?: boolean;
  replayActive?: boolean;
  replayFrac?: number;
  replay?: { active: boolean; onToggle: () => void };
}) {
  const reduced = useReducedMotion() ?? false;
  const baselines = useMemo(loadBaselines, []);
  const [a, b] = [state.teams[1], state.teams[2]];

  const mirror: [string, number, number][] = [
    ["Yellows", a.yellows, b.yellows],
    ["Reds", a.reds, b.reds],
    ["FK conceded · foul proxy", a.foulsProxy, b.foulsProxy],
    ["Dangerous FKs won", a.dangerFKs, b.dangerFKs],
    ["Corners", a.corners, b.corners],
    ["VAR against", a.varAgainst, b.varAgainst],
  ];
  const max = Math.max(1, ...mirror.flatMap(([, x, y]) => [x, y]));

  const lastVar = [...events].reverse().find((e) => e.kind === "var_end");
  const cardsA = a.yellows + a.reds;
  const cardsB = b.yellows + b.reds;
  const discP = percentile(baselines.disciplineSplit, Math.abs(cardsA - cardsB));
  const discTier = tierFor(discP);

  const analystContext: AnalystContext = useMemo(
    () => ({
      teams: { 1: teams[1].name, 2: teams[2].name },
      score: state.score,
      phase: state.phase,
      minute: state.minute,
      discipline: {
        yellows: [a.yellows, b.yellows],
        reds: [a.reds, b.reds],
        foulsProxy: [a.foulsProxy, b.foulsProxy],
        corners: [a.corners, b.corners],
        dangerousFreeKicks: [a.dangerFKs, b.dangerFKs],
      },
      var: {
        for: [a.varFor, b.varFor],
        against: [a.varAgainst, b.varAgainst],
        overturned: [a.varOverturned, b.varOverturned],
      },
      scorers: [1, 2].map((t) => ({
        team: teams[t as 1 | 2].name,
        players: players[t as 1 | 2]
          .filter((p) => p.goals > 0)
          .map((p) => `${p.name} (${p.goals})`),
      })),
      decisions: events
        .filter((e) => e.kind !== "phase_change")
        .slice(-40)
        .map((e) => ({
          minute: e.minute,
          team: e.team ? teams[e.team].name : null,
          text: `${e.kind}: ${e.detail}`,
        })),
    }),
    [teams, state, a, b, players, events],
  );

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-panel">
      <div className="stripes flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <span className="-skew-x-6 rounded-[2px] bg-amber px-2 py-0.5">
          <span
            className="inline-block skew-x-6 font-display text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--panel)" }}
          >
            Fairness
          </span>
        </span>
        {replay && (
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={replay.onToggle}
            className={`label min-h-6 cursor-pointer border px-2 ${
              replay.active
                ? "border-green !text-green"
                : "border-border hover:border-green hover:!text-green"
            }`}
          >
            {replay.active ? "■ Stop Replay" : "▶ Replay Match"}
          </motion.button>
        )}
      </div>
      {replayActive && (
        <div className="shrink-0 border-b border-green bg-[color-mix(in_srgb,var(--green)_8%,transparent)]">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="live-dot size-2 rounded-full bg-green" />
            <span className="font-display text-xs font-bold tracking-wide text-green">
              REPLAYING
            </span>
            <span className="ml-auto font-display text-base font-bold tabular-nums">
              {state.minute ?? 0}&apos;
            </span>
          </div>
          <div className="h-1 w-full bg-border">
            <motion.div
              className="h-full bg-green"
              animate={{ width: `${Math.round((replayFrac ?? 0) * 100)}%` }}
              transition={{ ease: "linear", duration: 0.12 }}
            />
          </div>
        </div>
      )}
      <motion.div
        key={matchKey}
        initial={reduced ? false : "hidden"}
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} className="border-b border-border pb-4">
          <div className="flex items-end justify-between gap-2">
            <span className="flex max-w-[30%] items-center gap-1.5">
              <Flag name={teams[1].name} />
              <span className="truncate font-display text-base font-bold uppercase tracking-wider text-amber">
                {teams[1].name}
              </span>
            </span>
            <span className="bignum glow font-display text-6xl font-bold">
              <Digit value={state.score[1]} color="var(--amber)" />
              <span className="text-muted"> — </span>
              <Digit value={state.score[2]} color="var(--blue)" />
            </span>
            <span className="flex max-w-[30%] items-center justify-end gap-1.5">
              <span className="truncate font-display text-base font-bold uppercase tracking-wider text-blue">
                {teams[2].name}
              </span>
              <Flag name={teams[2].name} />
            </span>
          </div>
          <div className="label mt-2 text-center">
            {kickoff
              ? `${new Date(kickoff).toLocaleDateString([], { month: "short", day: "numeric" })} · `
              : ""}
            {state.phase}
            {state.minute !== null ? ` · ${state.minute}'` : ""}
          </div>
          {events.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {(
                [
                  [`${events.filter((e) => e.kind === "goal").length} goals`, "var(--green)"],
                  [
                    `${events.filter((e) => ["yellow", "red", "second_yellow"].includes(e.kind)).length} cards`,
                    "var(--yellow)",
                  ],
                  [`${events.filter((e) => e.kind === "var_start").length} var`, "var(--amber)"],
                  [`${events.length} decisions`, "var(--blue)"],
                ] as const
              ).map(([text, color]) => (
                <span
                  key={text}
                  className="label rounded-[4px] border px-1.5 py-0.5"
                  style={{ borderColor: color, color }}
                >
                  {text}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {events.length > 0 && (
          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
            <AiAnalyst context={analystContext} matchKey={matchKey ?? ""} />
          </motion.div>
        )}

        {oddsSeries.length > 0 && (
          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
            <MarketPulse
              oddsSeries={oddsSeries}
              events={events}
              teams={teams}
              simulated={oddsSimulated ?? false}
              onHighlight={onHighlight}
            />
          </motion.div>
        )}

        {(players[1].length > 0 || players[2].length > 0) && (
          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
            <Section accent="var(--green)" title="Scorers & Bookings" />
            <div className="grid grid-cols-2 gap-2">
              {([1, 2] as const).map((t) => (
                <div key={t} className="border border-border p-2">
                  <div
                    className="label mb-1 truncate"
                    style={{ color: t === 1 ? "var(--amber)" : "var(--blue)" }}
                  >
                    {teams[t].name}
                  </div>
                  {players[t].length === 0 ? (
                    <div className="label !text-[10px]">—</div>
                  ) : (
                    <ul className="flex flex-col gap-0.5 text-xs">
                      {players[t].map((p) => (
                        <li key={p.name} className="flex items-center gap-1">
                          <span className="min-w-0 flex-1 truncate">{p.name}</span>
                          {p.goals > 0 && (
                            <span className="text-green">
                              {"⚽".repeat(Math.min(p.goals, 3))}
                              {p.goals > 3 ? `×${p.goals}` : ""}
                            </span>
                          )}
                          {p.yellows > 0 && <span className="inline-block h-3 w-2 rounded-[1px]" style={{ background: "var(--yellow)" }} />}
                          {p.reds > 0 && <span className="inline-block h-3 w-2 rounded-[1px]" style={{ background: "var(--red)" }} />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
          <Section accent="var(--amber)" title="Discipline Mirror" />
          <div className="flex flex-col gap-2.5">
            {mirror.map(([label, av, bv]) => (
              <MirrorRow key={label} label={label} a={av} b={bv} max={max} reduced={reduced} />
            ))}
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
          <Section accent="var(--red)" title="VAR" />
          <div className="grid grid-cols-[1fr_2.5rem_2.5rem] gap-y-1 border border-border p-2 text-xs tabular-nums">
            <span />
            <span className="label text-center !text-amber">{teams[1].code}</span>
            <span className="label text-center !text-blue">{teams[2].code}</span>
            <span className="label">Reviews for</span>
            <span className="text-center">{a.varFor}</span>
            <span className="text-center">{b.varFor}</span>
            <span className="label">Reviews against</span>
            <span className="text-center">{a.varAgainst}</span>
            <span className="text-center">{b.varAgainst}</span>
            <span className="label">Overturned</span>
            <span className="text-center">{a.varOverturned}</span>
            <span className="text-center">{b.varOverturned}</span>
            <span className="label col-span-3 mt-1 border-t border-border pt-1">
              Last outcome: {lastVar ? `${lastVar.detail}${lastVar.team ? ` (${teams[lastVar.team].code})` : ""}` : "—"}
            </span>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
          <Section accent="var(--green)" title="How This Match Compares" />
          <p className="label mb-3 !normal-case !tracking-normal">
            Each bar places this match against every other World Cup match. Green is
            typical, amber unusual, red rare — a marker far right means one team got
            far more than the other.
          </p>
          <div className="flex flex-col gap-3">
            <BaselineRow
              label="card difference between teams"
              value={Math.abs(a.yellows + a.reds - (b.yellows + b.reds))}
              sample={baselines.disciplineSplit}
              reduced={reduced}
            />
            <BaselineRow
              label="foul difference between teams"
              value={Math.abs(a.foulsProxy - b.foulsProxy)}
              sample={baselines.foulsSplit}
              reduced={reduced}
            />
            <BaselineRow
              label="VAR reviews against one team vs the other"
              value={Math.abs(a.varAgainst - b.varAgainst)}
              sample={baselines.varAgainstSplit}
              reduced={reduced}
            />
          </div>
          <p className="mt-3 border-t border-border pt-2 text-xs leading-relaxed text-muted">
            Bottom line: the two teams were shown{" "}
            <span className="font-bold text-text">
              {cardsA} and {cardsB} cards
            </span>
            . That gap is{" "}
            <span className="font-bold" style={{ color: TIER_COLORS[discTier] }}>
              {discTier}
            </span>{" "}
            for this tournament ({ordinal(discP)} percentile).
          </p>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
          <div className="mb-2 flex items-center justify-between">
            <Section accent="var(--blue)" title="Timeline" />
            <span className="label !normal-case !tracking-normal">tap a mark → ledger</span>
          </div>
          <Timeline
            events={events}
            onHighlight={onHighlight}
            highlightId={highlightId ?? null}
            playhead={replayActive ? (state.minute ?? 0) : undefined}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
