"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";

export default function TopBar({
  matchTitle,
  phase,
  live,
  sourceLabel,
  onWordmarkTap,
  onMatches,
}: {
  matchTitle: string;
  phase: string;
  live: boolean;
  sourceLabel: string;
  onWordmarkTap: () => void;
  onMatches: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 sm:gap-4 sm:px-4">
      <button
        onClick={onWordmarkTap}
        className="wordmark cursor-default select-none font-display text-base font-bold tracking-[0.18em]"
      >
        REF
      </button>
      <span
        className="hidden truncate text-xs text-muted sm:inline"
        suppressHydrationWarning
      >
        {matchTitle}
      </span>
      <span className="relative border border-border px-1.5 py-0.5 text-[11px] tabular-nums">
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
