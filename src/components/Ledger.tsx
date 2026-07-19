"use client";

import { motion, useReducedMotion } from "framer-motion";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { TeamMeta } from "@/components/Dashboard";
import type { RefEvent, RefKind } from "@/lib/types";

type Entry = {
  event: RefEvent;
  text: string;
  accent: string;
  flash: string | null;
  varState: "open" | "STANDS" | "OVERTURNED" | null;
};

const ACCENTS: Partial<Record<RefKind, string>> = {
  yellow: "var(--yellow)",
  red: "var(--red)",
  second_yellow: "var(--red)",
  penalty_awarded: "var(--red)",
  penalty_outcome: "var(--red)",
  var_start: "var(--amber)",
  goal: "var(--green)",
};

const RED_FLASH = "color-mix(in srgb, var(--red) 12%, transparent)";
const AMBER_FLASH = "color-mix(in srgb, var(--amber) 12%, transparent)";

function textFor(e: RefEvent): string {
  switch (e.kind) {
    case "goal":
      return e.detail === "PENALTY" ? "GOAL · PENALTY" : "GOAL";
    case "yellow":
      return "YELLOW CARD";
    case "second_yellow":
      return "SECOND YELLOW · RED";
    case "red":
      return "RED CARD";
    case "penalty_awarded":
      return "PENALTY AWARDED";
    case "penalty_outcome":
      return `PENALTY · ${e.detail}`;
    case "var_start":
      return `VAR REVIEW · ${e.detail.replace("VAR · ", "")}`;
    case "amend":
      return e.detail === "CORRECTION" ? "CORRECTION" : e.detail.replace(" REMOVED", " DISALLOWED");
    case "free_kick":
      return `FREE KICK · ${e.detail}`;
    case "phase_change":
      return e.detail;
    default:
      return e.detail;
  }
}

function buildEntries(events: RefEvent[]): Entry[] {
  const entries: Entry[] = [];
  for (const e of events) {
    if (e.kind === "var_end") {
      const outcome = e.detail.includes("OVERTURNED") ? "OVERTURNED" : "STANDS";
      const open = [...entries]
        .reverse()
        .find((x) => x.varState === "open" && (e.team === null || x.event.team === null || x.event.team === e.team));
      if (open) {
        open.varState = outcome;
        if (outcome === "OVERTURNED") open.flash = AMBER_FLASH;
        continue;
      }
    }
    entries.push({
      event: e,
      text: textFor(e),
      accent: ACCENTS[e.kind] ?? "var(--border)",
      flash: ["red", "second_yellow", "penalty_awarded", "penalty_outcome"].includes(e.kind)
        ? RED_FLASH
        : null,
      varState: e.kind === "var_start" ? "open" : null,
    });
  }
  return entries.reverse().slice(0, 200);
}

const FILTERS: Record<string, RefKind[] | null> = {
  ALL: null,
  CARDS: ["yellow", "red", "second_yellow"],
  VAR: ["var_start", "var_end"],
  GOALS: ["goal", "penalty_awarded", "penalty_outcome", "amend"],
};

const Row = memo(
  function Row({
    entry,
    highlighted,
    reduced,
    teams,
  }: {
    entry: Entry;
    highlighted: boolean;
    reduced: boolean;
    teams: TeamMeta;
  }) {
    const { event: e } = entry;
    const ref = useRef<HTMLLIElement>(null);
    useEffect(() => {
      if (highlighted) ref.current?.scrollIntoView({ block: "nearest" });
    }, [highlighted]);
    return (
      <motion.li
        ref={ref}
        layout={reduced ? false : "position"}
        initial={reduced ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative flex items-baseline gap-2 border-l-2 px-2 py-1.5 text-xs"
        style={{
          borderLeftColor: entry.accent,
          background: highlighted ? "color-mix(in srgb, var(--muted) 14%, transparent)" : undefined,
        }}
        data-event-id={e.id}
      >
        {entry.flash && !reduced && (
          <motion.span
            key={`${entry.varState}`}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            style={{ background: entry.flash }}
          />
        )}
        <span className="w-8 shrink-0 text-right tabular-nums text-muted">
          {e.minute !== null ? `${e.minute}'` : "—"}
        </span>
        {e.team ? (
          <span
            className="min-w-4 shrink-0 border px-0.5 text-center text-[10px] leading-4"
            style={{
              color: e.team === 1 ? "var(--amber)" : "var(--blue)",
              borderColor: "currentcolor",
            }}
          >
            {teams[e.team].code}
          </span>
        ) : (
          <span className="min-w-4 shrink-0" />
        )}
        <span className="min-w-0 truncate">{entry.text}</span>
        {entry.varState === "open" && (
          <span className="pulse-soft label shrink-0" style={{ color: "var(--amber)" }}>
            REVIEW IN PROGRESS
          </span>
        )}
        {(entry.varState === "STANDS" || entry.varState === "OVERTURNED") && (
          <motion.span
            initial={reduced ? false : { opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="label shrink-0"
            style={{
              color: entry.varState === "OVERTURNED" ? "var(--amber)" : "var(--muted)",
            }}
          >
            {entry.varState}
          </motion.span>
        )}
        <span className="ml-auto shrink-0 pl-2">
          {e.verify.status === "anchored" ? (
            <a
              href={e.verify.ref}
              target="_blank"
              rel="noreferrer"
              className="text-green"
              aria-label="Verification anchored"
            >
              ✓
            </a>
          ) : e.verify.status === "failed" ? (
            <span className="text-muted" aria-label="Verification failed">
              ×
            </span>
          ) : (
            <span
              className="inline-block size-1.5 rounded-full border border-muted align-middle"
              aria-label="Verification pending"
            />
          )}
        </span>
      </motion.li>
    );
  },
  (a, b) =>
    a.entry.event.id === b.entry.event.id &&
    a.entry.varState === b.entry.varState &&
    a.entry.event.verify.status === b.entry.event.verify.status &&
    a.highlighted === b.highlighted &&
    a.reduced === b.reduced &&
    a.teams === b.teams,
);

export default function Ledger({
  events,
  highlightId,
  teams,
  empty,
}: {
  events: RefEvent[];
  highlightId: string | null;
  teams: TeamMeta;
  empty: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const [filter, setFilter] = useState("ALL");
  const [newCount, setNewCount] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const atTop = useRef(true);
  const prevCount = useRef(0);

  const entries = useMemo(() => buildEntries(events), [events]);
  const kinds = FILTERS[filter];
  const visible = kinds
    ? entries.filter((x) => kinds.includes(x.event.kind))
    : entries;

  useEffect(() => {
    const added = entries.length - prevCount.current;
    prevCount.current = entries.length;
    if (added > 0 && !atTop.current) setNewCount((c) => c + added);
  }, [entries.length]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    atTop.current = el.scrollTop < 8;
    if (atTop.current) setNewCount(0);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-panel">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <span className="label">Decision Ledger</span>
        <span className="label tabular-nums">{entries.length}</span>
        <span className="ml-auto flex gap-1">
          {Object.keys(FILTERS).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`label cursor-pointer px-1.5 py-0.5 ${
                filter === f ? "bg-text !text-panel" : "hover:text-text"
              }`}
            >
              {f}
            </button>
          ))}
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        {newCount > 0 && (
          <button
            onClick={() => {
              listRef.current?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
              setNewCount(0);
            }}
            className="label absolute left-1/2 top-2 z-10 -translate-x-1/2 cursor-pointer border border-border bg-panel px-2 py-1"
          >
            · {newCount} new
          </button>
        )}
        <div ref={listRef} onScroll={onScroll} className="h-full overflow-y-auto">
          {visible.length === 0 ? (
            <p className="label flex items-center gap-1.5 p-3">
              <span className="live-dot size-1.5 rounded-full bg-green" />
              {empty}
            </p>
          ) : (
            <ul className="flex flex-col py-1">
              {visible.map((entry) => (
                <Row
                  key={entry.event.id}
                  entry={entry}
                  highlighted={entry.event.id === highlightId}
                  reduced={reduced}
                  teams={teams}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
