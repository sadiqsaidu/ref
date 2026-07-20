"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import type { TeamMeta } from "@/components/Dashboard";
import { computeImpacts, integrityHolds, isMajor } from "@/lib/impact";
import type { OddsTick } from "@/lib/odds";
import type { RefEvent } from "@/lib/types";

const MARKER_COLORS: Record<string, string> = {
  goal: "var(--green)",
  red: "var(--red)",
  second_yellow: "var(--red)",
  penalty_awarded: "var(--red)",
  var_end: "var(--amber)",
};

const H = 170;
const PAD_T = 14;
const PAD_B = 18;
const PAD_L = 6;
const PAD_R = 10;

export default function MarketPulse({
  oddsSeries,
  events,
  teams,
  simulated,
  onHighlight,
}: {
  oddsSeries: OddsTick[];
  events: RefEvent[];
  teams: TeamMeta;
  simulated: boolean;
  onHighlight: (id: string | null) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const [w, setW] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);
  // callback ref so the observer attaches whenever the chart node mounts,
  // including after the empty → populated transition
  const setWrap = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    roRef.current = ro;
    setW(el.clientWidth);
  }, []);

  const impacts = useMemo(() => computeImpacts(events, oddsSeries), [events, oddsSeries]);
  const integrity = useMemo(() => integrityHolds(events, oddsSeries), [events, oddsSeries]);

  const maxMin = useMemo(() => {
    const m = Math.max(90, ...oddsSeries.map((t) => t.minute), ...events.map((e) => e.minute ?? 0));
    return m > 90 ? 120 : 90;
  }, [oddsSeries, events]);

  const x = (min: number) => PAD_L + (Math.min(min, maxMin) / maxMin) * (w - PAD_L - PAD_R);
  const y = (p: number) => PAD_T + (1 - p) * (H - PAD_T - PAD_B);

  const line = (pick: (t: OddsTick) => number) =>
    oddsSeries.map((t, i) => `${i === 0 ? "M" : "L"} ${x(t.minute).toFixed(1)} ${y(pick(t)).toFixed(1)}`).join(" ");

  const last = oddsSeries[oddsSeries.length - 1];
  const majors = events.filter(isMajor);

  if (oddsSeries.length === 0) {
    return (
      <div>
        <Header simulated={simulated} teams={teams} />
        <p className="label mt-2">Awaiting odds ticks…</p>
      </div>
    );
  }

  return (
    <div>
      <Header simulated={simulated} teams={teams} />

      <div ref={setWrap} className="mt-2">
        {w > 0 && (
          <svg width={w} height={H} className="block overflow-visible">
            {[0.25, 0.5, 0.75].map((g) => (
              <g key={g}>
                <line
                  x1={PAD_L}
                  y1={y(g)}
                  x2={w - PAD_R}
                  y2={y(g)}
                  stroke="var(--border)"
                  strokeDasharray="2 3"
                />
                <text x={PAD_L} y={y(g) - 2} className="fill-muted" style={{ fontSize: 8 }}>
                  {g * 100}%
                </text>
              </g>
            ))}
            {majors.map((e) => (
              <line
                key={`mk-${e.id}`}
                x1={x(e.minute ?? 0)}
                y1={PAD_T}
                x2={x(e.minute ?? 0)}
                y2={H - PAD_B}
                stroke={MARKER_COLORS[e.kind] ?? "var(--muted)"}
                strokeWidth="1"
                strokeOpacity="0.5"
              />
            ))}
            <path d={line((t) => t.pDraw)} fill="none" stroke="var(--muted)" strokeWidth="1" strokeOpacity="0.6" />
            <path d={line((t) => t.pB)} fill="none" stroke="var(--blue)" strokeWidth="1.75" />
            <path d={line((t) => t.pA)} fill="none" stroke="var(--amber)" strokeWidth="1.75" />
            {last && (
              <>
                <circle cx={x(last.minute)} cy={y(last.pA)} r="2.5" fill="var(--amber)" className={reduced ? "" : "live-dot"} />
                <circle cx={x(last.minute)} cy={y(last.pB)} r="2.5" fill="var(--blue)" className={reduced ? "" : "live-dot"} />
              </>
            )}
            {impacts
              .filter((im) => Math.abs(im.delta) >= 3)
              .map((im) => (
                <text
                  key={`tag-${im.id}`}
                  x={x(im.minute ?? 0)}
                  y={PAD_T - 4}
                  textAnchor="middle"
                  style={{ fontSize: 8, fontWeight: 700 }}
                  fill={im.team === 1 ? "var(--amber)" : "var(--blue)"}
                >
                  {im.delta >= 0 ? "+" : ""}
                  {im.delta.toFixed(0)}
                </text>
              ))}
          </svg>
        )}
        <div className="label mt-0.5 flex justify-between">
          <span>0&apos;</span>
          <span>45&apos;</span>
          <span>{maxMin}&apos;</span>
        </div>
      </div>

      {impacts.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <div className="label mb-1">Market Impact</div>
          <table className="w-full min-w-[18rem] text-xs tabular-nums">
            <tbody>
              {impacts.map((im) => (
                <motion.tr
                  key={im.id}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="row-hover cursor-pointer"
                  onMouseEnter={() => onHighlight(im.id)}
                  onMouseLeave={() => onHighlight(null)}
                  onClick={() => onHighlight(im.id)}
                >
                  <td className="w-10 py-0.5 text-muted">{im.minute ?? "—"}&apos;</td>
                  <td className="py-0.5">
                    {im.label}
                    <span className="ml-1 text-muted">{teams[im.team ?? 1].code}</span>
                  </td>
                  <td
                    className="py-0.5 text-right font-bold"
                    style={{ color: im.team === 1 ? "var(--amber)" : "var(--blue)" }}
                  >
                    {im.delta >= 0 ? "+" : ""}
                    {im.delta.toFixed(1)} pts
                  </td>
                  <td className="w-6 py-0.5 text-right" style={{ color: im.delta >= 0 ? "var(--green)" : "var(--red)" }}>
                    {im.delta >= 0 ? "▲" : "▼"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {integrity && (
        <p className="label mt-2 leading-relaxed">
          Consensus odds reprice after decisions, not before — consistent with fair play.
        </p>
      )}
    </div>
  );
}

function Header({ simulated, teams }: { simulated: boolean; teams: TeamMeta }) {
  return (
    <div className="flex items-center justify-between">
      <div className="label flex items-center gap-1.5">
        <span className="size-1.5" style={{ background: "var(--green)" }} />
        Market Pulse
        <span className="ml-1 text-amber">{teams[1].code}</span>
        <span className="text-blue">{teams[2].code}</span>
        <span className="text-muted">· win prob</span>
      </div>
      <span
        className="label rounded-[3px] border px-1.5 py-0.5"
        style={{
          borderColor: simulated ? "var(--amber)" : "var(--green)",
          color: simulated ? "var(--amber)" : "var(--green)",
        }}
      >
        {simulated ? "SIMULATED" : "LIVE ODDS"}
      </span>
    </div>
  );
}
