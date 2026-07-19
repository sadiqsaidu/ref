"use client";

import { motion, useReducedMotion } from "framer-motion";
import { memo, useEffect, useMemo, useRef, useState } from "react";
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
          <motion.rect
            y="1"
            height="8"
            fill="var(--amber)"
            animate={{ x: 50 - wA, width: wA }}
            transition={spring}
          />
          <motion.rect
            x="50"
            y="1"
            height="8"
            fill="var(--blue)"
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

  const plotted = events.filter(
    (e) => e.minute !== null && e.kind !== "phase_change" && e.kind !== "var_end",
  );
  const maxMin = plotted.some((e) => (e.minute ?? 0) > 90) ? 120 : 90;
  const pad = 4;
  const x = (m: number) => pad + (Math.min(m, maxMin) / maxMin) * (w - pad * 2);

  return (
    <div ref={wrapRef}>
      {w > 0 && (
        <svg width={w} height="20" className="block">
          <line x1={pad} y1="10" x2={w - pad} y2="10" stroke="var(--border)" />
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

export default function Fairness({
  state,
  events,
  onHighlight,
}: {
  state: MatchState;
  events: RefEvent[];
  onHighlight: (id: string | null) => void;
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
      <div className="label shrink-0 border-b border-border px-3 py-2">Fairness</div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3">
        <div className="border-b border-border pb-4">
          <div className="flex items-end justify-between">
            <span className="label text-amber">Team A</span>
            <span className="bignum text-5xl">
              <span className="text-amber">{state.score[1]}</span>
              <span className="text-muted"> — </span>
              <span className="text-blue">{state.score[2]}</span>
            </span>
            <span className="label text-blue">Team B</span>
          </div>
          <div className="label mt-2 text-center">
            {state.phase}
            {state.minute !== null ? ` · ${state.minute}'` : ""}
          </div>
        </div>

        <div>
          <div className="label mb-2">Discipline Mirror</div>
          <div className="flex flex-col gap-2.5">
            {mirror.map(([label, av, bv]) => (
              <MirrorRow key={label} label={label} a={av} b={bv} max={max} reduced={reduced} />
            ))}
          </div>
        </div>

        <div>
          <div className="label mb-2">VAR</div>
          <div className="grid grid-cols-[1fr_2.5rem_2.5rem] gap-y-1 border border-border p-2 text-xs tabular-nums">
            <span />
            <span className="label text-center !text-amber">A</span>
            <span className="label text-center !text-blue">B</span>
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
              Last outcome: {lastVar ? `${lastVar.detail}${lastVar.team ? ` (${lastVar.team === 1 ? "A" : "B"})` : ""}` : "—"}
            </span>
          </div>
        </div>

        <div>
          <div className="label mb-2">Context · Tournament Baselines</div>
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
        </div>

        <p className="label">
          Discipline split {cardsA}–{cardsB} · {ordinal(discP)} pct · {discTier} for this
          tournament
        </p>

        <div>
          <div className="label mb-2">Timeline</div>
          <Timeline events={events} onHighlight={onHighlight} />
        </div>
      </div>
    </section>
  );
}
