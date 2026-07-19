"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";

export default function TopBar({
  matchTitle,
  phase,
  live,
  sourceLabel,
  onWordmarkTap,
}: {
  matchTitle: string;
  phase: string;
  live: boolean;
  sourceLabel: string;
  onWordmarkTap: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 sm:gap-4 sm:px-4">
      <button
        onClick={onWordmarkTap}
        className="cursor-default select-none text-sm font-bold tracking-[0.2em]"
      >
        REF
      </button>
      <span className="hidden text-xs text-muted sm:inline">
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
