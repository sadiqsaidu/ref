"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Flag from "@/components/Flag";

export type WcMatch = {
  id: string;
  p1: string;
  p2: string;
  competition: string;
  startTime: number;
};

export default function MatchBrowser({
  open,
  selectedId,
  onSelect,
  onClose,
  onLoaded,
  reduced,
}: {
  open: boolean;
  selectedId: string | undefined;
  onSelect: (m: WcMatch) => void;
  onClose: () => void;
  onLoaded: (matches: WcMatch[]) => void;
  reduced: boolean;
}) {
  const [matches, setMatches] = useState<WcMatch[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || matches) return;
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d: { matches: WcMatch[] }) => {
        setMatches(d.matches);
        onLoaded(d.matches);
        if (d.matches.length === 0) setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [open, matches, onLoaded]);

  const dayOf = (t: number) =>
    new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.aside
            initial={reduced ? false : { x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? undefined : { x: -30, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-y-0 left-0 z-50 flex w-full flex-col border-r border-border bg-panel sm:w-96"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
              <span className="font-display text-sm font-bold uppercase tracking-wider">
                Matches
              </span>
              <button
                onClick={onClose}
                className="label min-h-11 cursor-pointer px-2 hover:text-text"
              >
                ESC
              </button>
            </div>
            <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-3 py-2">
              <span className="label shrink-0 rounded-[4px] border border-green bg-[color-mix(in_srgb,var(--green)_10%,transparent)] px-2 py-1 !text-green">
                World Cup 2026
              </span>
              {["Premier League", "La Liga", "Serie A"].map((c) => (
                <span
                  key={c}
                  title="Not available on the free tier yet"
                  className="label shrink-0 cursor-not-allowed rounded-[4px] border border-border px-2 py-1 opacity-40"
                >
                  {c} · soon
                </span>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {matches === null && !failed && (
                <div className="flex flex-col gap-2 p-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="pulse-soft h-10 border border-border" />
                  ))}
                  <p className="label">Loading tournament fixtures…</p>
                </div>
              )}
              {failed && (
                <p className="label p-3">
                  Fixture list unreachable · check TXLINE_API_TOKEN and network
                </p>
              )}
              {matches && matches.length > 0 && (
                <ul>
                  {matches.map((m, i) => (
                    <motion.li
                      key={m.id}
                      initial={reduced ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.3) }}
                    >
                      <motion.button
                        whileHover={reduced ? undefined : { x: 3 }}
                        whileTap={reduced ? undefined : { scale: 0.98 }}
                        onClick={() => onSelect(m)}
                        className={`row-hover flex min-h-11 w-full cursor-pointer items-center gap-2 border-b border-border px-3 text-left text-xs ${
                          m.id === selectedId
                            ? "border-l-2 border-l-green bg-[color-mix(in_srgb,var(--green)_8%,transparent)]"
                            : "border-l-2 border-l-transparent"
                        }`}
                      >
                        <span className="label w-12 shrink-0 tabular-nums">
                          {dayOf(m.startTime)}
                        </span>
                        <Flag name={m.p1} />
                        <span className="min-w-0 flex-1 truncate">
                          {m.p1} <span className="text-muted">v</span> {m.p2}
                        </span>
                        <Flag name={m.p2} />
                      </motion.button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
