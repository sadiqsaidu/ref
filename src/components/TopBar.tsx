"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import type { Competition, TeamMeta } from "@/components/Dashboard";
import ThemeToggle from "./ThemeToggle";

export default function TopBar({
  matchTitle,
  phase,
  live,
  sourceLabel,
  score,
  teams,
  competitions,
  competitionId,
  onCompetition,
  onMatches,
  onControls,
}: {
  matchTitle: string;
  phase: string;
  live: boolean;
  sourceLabel: string;
  score: { 1: number; 2: number } | null;
  teams: TeamMeta;
  competitions: Competition[];
  competitionId: number | null;
  onCompetition: (id: number) => void;
  onMatches: () => void;
  onControls: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  return (
    <header className="stripes flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
      <Link
        href="/"
        className="wordmark select-none font-display text-base font-bold tracking-[0.18em]"
      >
        REF
      </Link>
      {competitions.length > 0 && (
        <label className="relative shrink-0">
          <select
            value={competitionId ?? ""}
            onChange={(e) => onCompetition(Number(e.target.value))}
            className="label max-w-[9rem] cursor-pointer truncate rounded-[4px] border border-border bg-panel py-1 pl-2 pr-5 hover:border-green hover:!text-green"
            aria-label="Competition"
          >
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-muted">
            ▼
          </span>
        </label>
      )}
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
      <button
        onClick={onControls}
        aria-label="Controls"
        className="label min-h-11 cursor-pointer px-1.5 hover:text-text"
      >
        ⚙
      </button>
      <ThemeToggle />
    </header>
  );
}
