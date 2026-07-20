"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { TeamMeta } from "@/components/Dashboard";
import ThemeToggle from "./ThemeToggle";

export default function TopBar({
  matchTitle,
  phase,
  live,
  sourceLabel,
  score,
  teams,
  onWordmarkTap,
  onMatches,
}: {
  matchTitle: string;
  phase: string;
  live: boolean;
  sourceLabel: string;
  score: { 1: number; 2: number } | null;
  teams: TeamMeta;
  onWordmarkTap: () => void;
  onMatches: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  return (
    <header className="stripes flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
      <button
        onClick={onWordmarkTap}
        className="wordmark cursor-default select-none font-display text-base font-bold tracking-[0.18em]"
      >
        REF
      </button>
      {score && (
        <motion.span
          initial={reduced ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex shrink-0 items-center overflow-hidden rounded-[4px] border border-border font-display text-xs font-bold"
        >
          <span className="bg-amber px-1.5 py-1" style={{ color: "var(--panel)" }}>
            {teams[1].code}
          </span>
          <span className="px-2 tabular-nums">
            {score[1]} : {score[2]}
          </span>
          <span className="bg-blue px-1.5 py-1" style={{ color: "var(--panel)" }}>
            {teams[2].code}
          </span>
        </motion.span>
      )}
      <span
        className="hidden truncate text-xs text-muted sm:inline"
        suppressHydrationWarning
      >
        {matchTitle}
      </span>
      <span className="relative shrink-0 border border-border px-1.5 py-0.5 text-[11px] tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={phase}
            className="inline-block whitespace-nowrap"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {phase}
          </motion.span>
        </AnimatePresence>
      </span>
      <motion.button
        whileTap={reduced ? undefined : { scale: 0.94 }}
        onClick={onMatches}
        className="label hidden min-h-11 cursor-pointer rounded-[4px] border border-border px-2.5 hover:border-green hover:!text-green lg:block"
      >
        Matches
      </motion.button>
      <span className="ml-auto flex items-center gap-1.5">
        <span
          className={`size-1.5 rounded-full ${
            live ? "live-dot bg-green" : "bg-muted"
          }`}
        />
        <span className="label">{live ? "LIVE" : "OFF"}</span>
        <span className="label hidden sm:inline" suppressHydrationWarning>
          · {sourceLabel}
        </span>
      </span>
      <ThemeToggle />
    </header>
  );
}
