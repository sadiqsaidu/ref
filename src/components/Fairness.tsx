"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import type { TeamMeta } from "@/components/Dashboard";
import Flag from "@/components/Flag";
import MarketPulse from "@/components/MarketPulse";
import type { OddsTick } from "@/lib/odds";
import { loadBaselines } from "@/lib/baselines";
import { ordinal, percentile, tierFor } from "@/lib/percentile";
import type { MatchState } from "@/lib/reduce";
import type { RefEvent, RefKind } from "@/lib/types";

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

function Timeline({
  events,
  onHighlight,
}: {
  events: RefEvent[];
  onHighlight: (id: string | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const reduced = useReducedMotion() ?? false;
  const plotted = events.filter(
    (e) => e.minute !== null && e.kind !== "phase_change" && e.kind !== "var_end",
  );
  const maxMin = plotted.some((e) => (e.minute ?? 0) > 90) ? 120 : 90;
  const pad = 4;
  const x = (m: number) => pad + (Math.min(m, maxMin) / maxMin) * (w - pad * 2);
  const lastGoal = [...plotted].reverse().find((e) => e.kind === "goal");

  return (
    <div ref={wrapRef}>
      {w > 0 && (
        <svg width={w} height="20" className="block">
          <line x1={pad} y1="10" x2={w - pad} y2="10" stroke="var(--border)" />
          {lastGoal && !reduced && (
            <motion.circle
              key={lastGoal.id}
              cx={x(lastGoal.minute!)}
              cy="10"
              fill="none"
              stroke="var(--green)"
              initial={{ r: 2, opacity: 0.9 }}
              animate={{ r: 9, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          )}
          {[45, 90].map((m) => (
            <line key={m} x1={x(m)} y1="7" x2={x(m)} y2="13" stroke="var(--muted)" strokeWidth="1" />
          ))}
          {plotted.map((e) =>
            e.kind === "var_start" ? (
              <g key={e.id}>
                <path
                  d={`M ${x(e.minute!)} 4 L ${x(e.minute!) + 4} 10 L ${x(e.minute!)} 16 L ${x(e.minute!) - 4} 10 Z`}
                  fill="none"
                  stroke="var(--amber)"
                  strokeWidth="1"
                />
                <rect
                  x={x(e.minute!) - 5}
                  y="0"
                  width="10"
                  height="20"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => onHighlight(e.id)}
                  onMouseLeave={() => onHighlight(null)}
                  onClick={() => onHighlight(e.id)}
                />
              </g>
            ) : (
              <g key={e.id}>
                <line
                  x1={x(e.minute!)}
                  y1="4"
                  x2={x(e.minute!)}
                  y2="16"
                  stroke={TICK_COLORS[e.kind] ?? "var(--muted)"}
                  strokeWidth="1.5"
                />
                <rect
                  x={x(e.minute!) - 3}
                  y="0"
                  width="6"
                  height="20"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => onHighlight(e.id)}
                  onMouseLeave={() => onHighlight(null)}
                  onClick={() => onHighlight(e.id)}
                />
              </g>
            ),
          )}
        </svg>
      )}
      <div className="label mt-0.5 flex justify-between">
        <span>0'</span>
        <span>45'</span>
        <span>{maxMin}'</span>
      </div>
    </div>
  );
}

const TIER_COLORS = {
  "within normal range": "var(--border)",
  unusual: "var(--amber)",
  rare: "var(--red)",
};

function Chip({ label, value, sample }: { label: string; value: number; sample: number[] }) {
  const p = percentile(sample, value);
  const tier = tierFor(p);
  return (
    <span
      className="label border px-1.5 py-1"
      style={{ borderColor: TIER_COLORS[tier] }}
    >
      {label} · {ordinal(p)} pct · {tier}
    </span>
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
  kickoff,
  matchKey,
  oddsSeries,
  oddsSimulated,
  replay,
}: {
  state: MatchState;
  events: RefEvent[];
  onHighlight: (id: string | null) => void;
  teams: TeamMeta;
  kickoff?: number;
  matchKey?: string;
  oddsSeries: OddsTick[];
  oddsSimulated: boolean;
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

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-panel">
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
      <motion.div
        key={matchKey}
        initial={reduced ? false : "hidden"}
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3"
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

        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
          <MarketPulse
            oddsSeries={oddsSeries}
            events={events}
            teams={teams}
            simulated={oddsSimulated}
            onHighlight={onHighlight}
          />
        </motion.div>

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
          <Section accent="var(--green)" title="Context · Tournament Baselines" />
          <div className="flex flex-wrap gap-1.5">
            <Chip
              label="Yellows split"
              value={Math.abs(a.yellows - b.yellows)}
              sample={baselines.yellowsSplit}
            />
            <Chip
              label="Fouls split"
              value={Math.abs(a.foulsProxy - b.foulsProxy)}
              sample={baselines.foulsSplit}
            />
            <Chip
              label="VAR against split"
              value={Math.abs(a.varAgainst - b.varAgainst)}
              sample={baselines.varAgainstSplit}
            />
          </div>
        </motion.div>

        <p className="label">
          Discipline split {cardsA}–{cardsB} · {ordinal(discP)} pct · {discTier} for this
          tournament
        </p>

        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
          <Section accent="var(--blue)" title="Timeline" />
          <Timeline events={events} onHighlight={onHighlight} />
        </motion.div>
      </motion.div>
    </section>
  );
}
