"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { TeamMeta } from "@/components/Dashboard";
import type { RefEvent } from "@/lib/types";

type Moment = {
  key: string;
  type: "red" | "overturn" | "goal";
  team: 1 | 2 | null;
};

const BANNERS: Record<Moment["type"], { text: string; color: string }> = {
  goal: { text: "GOAL", color: "var(--green)" },
  red: { text: "RED CARD", color: "var(--red)" },
  overturn: { text: "OVERTURNED", color: "var(--amber)" },
};

export default function Moments({
  events,
  teams,
  reduced,
  active,
}: {
  events: RefEvent[];
  teams: TeamMeta;
  reduced: boolean;
  active: boolean;
}) {
  const seen = useRef(0);
  const [moments, setMoments] = useState<Moment[]>([]);

  useEffect(() => {
    const fresh = events.slice(seen.current);
    seen.current = events.length;
    // banners only fire during replay — never on a normal instant match load
    if (reduced || !active) return;
    const add: Moment[] = [];
    for (const e of fresh) {
      if (e.kind === "goal") add.push({ key: e.id, type: "goal", team: e.team });
      if (e.kind === "red" || e.kind === "second_yellow")
        add.push({ key: e.id, type: "red", team: e.team });
      if (e.kind === "var_end" && e.detail.includes("OVERTURNED"))
        add.push({ key: e.id, type: "overturn", team: e.team });
    }
    if (!add.length) return;
    setMoments((m) => [...m, ...add]);
    for (const a of add) {
      setTimeout(
        () => setMoments((m) => m.filter((x) => x.key !== a.key)),
        a.type === "goal" ? 2600 : 2900,
      );
    }
  }, [events, reduced]);

  return (
    <>
      <AnimatePresence>
        {moments
          .filter((m) => m.type === "red")
          .map((m) => (
            <svg key={`sweep-${m.key}`} className="pointer-events-none fixed inset-0 z-40 size-full">
              <motion.rect
                x="1"
                y="1"
                width="99%"
                height="99%"
                fill="none"
                stroke="var(--red)"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: 1, opacity: [1, 1, 0] }}
                transition={{
                  pathLength: { duration: 0.7, ease: "easeInOut" },
                  opacity: { duration: 1, times: [0, 0.8, 1] },
                }}
              />
            </svg>
          ))}
        {moments
          .filter((m) => m.type === "overturn")
          .map((m) => (
            <motion.div
              key={`glow-${m.key}`}
              className="pointer-events-none fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.6, times: [0, 0.3, 1] }}
              style={{
                boxShadow: "inset 0 0 70px color-mix(in srgb, var(--amber) 35%, transparent)",
              }}
            />
          ))}
      </AnimatePresence>
      <div className="pointer-events-none fixed bottom-10 left-3 z-40 flex flex-col gap-2">
        <AnimatePresence>
          {moments.map((m) => {
            const b = BANNERS[m.type];
            return (
              <motion.div
                key={m.key}
                initial={{ x: -380, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -380, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                className="flex overflow-hidden rounded-[4px] border border-border shadow-lg"
              >
                <span
                  className="-skew-x-6 -ml-1 px-3 py-1.5 pl-4 font-display text-sm font-bold"
                  style={{ background: b.color, color: "var(--panel)" }}
                >
                  <span className="inline-block skew-x-6">{b.text}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-panel px-3 font-display text-sm font-bold">
                  {m.team && (
                    <span style={{ color: m.team === 1 ? "var(--amber)" : "var(--blue)" }}>
                      {teams[m.team].name.toUpperCase()}
                    </span>
                  )}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
