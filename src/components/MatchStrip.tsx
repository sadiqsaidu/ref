"use client";

import { motion } from "framer-motion";
import Flag from "@/components/Flag";
import type { WcMatch } from "@/components/MatchBrowser";

export default function MatchStrip({
  matches,
  activeId,
  onSelect,
  onExpand,
  reduced,
}: {
  matches: WcMatch[];
  activeId: string | undefined;
  onSelect: (m: WcMatch) => void;
  onExpand: () => void;
  reduced: boolean;
}) {
  if (matches.length === 0) return null;
  return (
    <div className="flex shrink-0 items-stretch gap-2 overflow-x-auto border-b border-border px-3 py-2">
      {matches.slice(0, 12).map((m, i) => {
        const active = m.id === activeId;
        return (
          <motion.button
            key={m.id}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : Math.min(i * 0.04, 0.4), duration: 0.25 }}
            whileHover={reduced ? undefined : { y: -2 }}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            onClick={() => onSelect(m)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-[4px] border px-2.5 py-1.5 ${
              active
                ? "border-green bg-[color-mix(in_srgb,var(--green)_10%,transparent)]"
                : "row-hover border-border"
            }`}
          >
            <Flag name={m.p1} />
            <span className="font-display text-xs font-bold tracking-wide">
              {m.p1.slice(0, 3).toUpperCase()} <span className="text-muted">v</span>{" "}
              {m.p2.slice(0, 3).toUpperCase()}
            </span>
            <Flag name={m.p2} />
            <span className="label">
              {new Date(m.startTime).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
          </motion.button>
        );
      })}
      <motion.button
        whileTap={reduced ? undefined : { scale: 0.96 }}
        onClick={onExpand}
        className="label shrink-0 cursor-pointer rounded-[4px] border border-border px-2.5 hover:border-green hover:!text-green"
      >
        All ↗
      </motion.button>
    </div>
  );
}
