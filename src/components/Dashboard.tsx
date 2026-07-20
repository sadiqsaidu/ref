"use client";

import { useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import Ledger from "@/components/Ledger";
import Fairness from "@/components/Fairness";
import Drawer from "@/components/Drawer";
import MatchBrowser, { type WcMatch } from "@/components/MatchBrowser";
import Moments from "@/components/Moments";
import { useMatchStream, type StreamConfig } from "@/hooks/useMatchStream";
import type { RefEvent, RefKind } from "@/lib/types";

export type FixtureInfo = {
  id: string;
  p1: string;
  p2: string;
  competition: string;
  startTime: number;
};

export type TeamMeta = Record<1 | 2, { code: string; name: string }>;

const FALLBACK_TEAMS: TeamMeta = {
  1: { code: "A", name: "Team A" },
  2: { code: "B", name: "Team B" },
};

const REPLAY_SPEED = 150;

export default function Dashboard({ network }: { network: string }) {
  const reduced = useReducedMotion() ?? false;
  const [tab, setTab] = useState<"ledger" | "fairness">("ledger");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [browser, setBrowser] = useState(false);
  const [fixtures, setFixtures] = useState<FixtureInfo[]>([]);
  const [wcMatches, setWcMatches] = useState<WcMatch[]>([]);
  const [defaultFixtureId, setDefaultFixtureId] = useState<string | null>(null);
  const [cfg, setCfg] = useState<StreamConfig>({ source: "live", speed: 4 });
  const { events, state, connection, inject } = useMatchStream(cfg);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if ([...p.keys()].length === 0) return;
    const speedParam = p.get("speed");
    setCfg({
      source: p.get("source") ?? "live",
      speed: speedParam === "instant" ? "instant" : Number(speedParam) || 4,
      name: p.get("name") ?? undefined,
      fixture: p.get("fixture") ?? undefined,
    });
  }, []);

  useEffect(() => {
    fetch("/api/fixtures")
      .then((r) => r.json())
      .then((d: { defaultFixtureId: string | null; fixtures: FixtureInfo[] }) => {
        setFixtures(d.fixtures ?? []);
        setDefaultFixtureId(d.defaultFixtureId);
      })
      .catch(() => {});
  }, []);

  const activeId = cfg.fixture ?? defaultFixtureId ?? undefined;
  const match = useMemo(
    () =>
      cfg.source === "history"
        ? wcMatches.find((m) => m.id === activeId)
        : cfg.source === "live"
          ? fixtures.find((f) => f.id === activeId)
          : undefined,
    [cfg.source, wcMatches, fixtures, activeId],
  );

  const teams: TeamMeta = match
    ? {
        1: { code: match.p1.slice(0, 3).toUpperCase(), name: match.p1 },
        2: { code: match.p2.slice(0, 3).toUpperCase(), name: match.p2 },
      }
    : FALLBACK_TEAMS;

  const matchTitle = match
    ? `${match.p1} v ${match.p2} · ${match.competition}`.toUpperCase()
    : cfg.source === "live"
      ? "LIVE · AWAITING FIXTURE"
      : cfg.source === "history"
        ? "MATCH RECORD"
        : cfg.source === "replay"
          ? `REPLAY · ${cfg.name ?? "match"}`.toUpperCase()
          : "REHEARSAL · SCRIPTED MATCH";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "d") setDrawer((d) => !d);
      if (e.key === "m") setBrowser((b) => !b);
      if (e.key === "Escape") {
        setDrawer(false);
        setBrowser(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const taps = useRef({ count: 0, at: 0 });
  const onWordmarkTap = () => {
    const now = Date.now();
    taps.current = {
      count: now - taps.current.at < 600 ? taps.current.count + 1 : 1,
      at: now,
    };
    if (taps.current.count >= 3) {
      taps.current.count = 0;
      setDrawer((d) => !d);
    }
  };

  const injectSeq = useRef(0);
  const fabricate = (kind: RefKind, team: 1 | 2, detail: string): RefEvent => ({
    id: `inj-${++injectSeq.current}`,
    ts: Date.now(),
    minute: state.minute ?? 0,
    phase: state.phase === "NS" ? "H1" : state.phase,
    team,
    kind,
    detail,
    verify: { status: "pending" },
  });
  const onInject = (kind: RefKind) => {
    const team: 1 | 2 = Math.random() < 0.5 ? 1 : 2;
    if (kind === "var_start") {
      inject([fabricate("var_start", team, "VAR · GOAL")]);
      setTimeout(() => inject([fabricate("var_end", team, "GOAL · OVERTURNED")]), 1400);
    } else if (kind === "yellow") {
      inject([fabricate("yellow", team, "YELLOW CARD")]);
    } else if (kind === "red") {
      inject([fabricate("red", team, "RED CARD")]);
    } else {
      inject([fabricate("goal", team, "GOAL")]);
    }
  };

  const onSelectMatch = useCallback((m: WcMatch) => {
    setCfg({ source: "history", speed: "instant", fixture: m.id });
    setBrowser(false);
  }, []);

  const replaying = cfg.source === "history" && cfg.speed !== "instant";
  const onToggleReplay = () =>
    setCfg((c) => ({ ...c, speed: c.speed === "instant" ? REPLAY_SPEED : "instant" }));

  const lastEvent = state.lastTs
    ? new Date(state.lastTs).toLocaleTimeString([], { hour12: false })
    : "—";
  const streamLabel =
    connection.status === "reconnecting"
      ? `reconnecting · attempt ${connection.attempt}`
      : connection.status;

  const empty =
    cfg.source === "live"
      ? connection.status === "error"
        ? "no live fixture · press m for world cup matches or d for controls"
        : connection.status === "reconnecting"
          ? "stream unreachable · check TXLINE_API_TOKEN · retrying"
          : "connected · awaiting first decision"
      : cfg.source === "history"
        ? connection.status === "reconnecting"
          ? "match record unavailable · check TXLINE_API_TOKEN · retrying"
          : "loading match record…"
        : "awaiting first decision";

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        matchTitle={matchTitle}
        phase={`${state.phase}${state.minute !== null ? ` ${state.minute}'` : ""}`}
        live={connection.status === "open"}
        sourceLabel={cfg.source.toUpperCase()}
        onWordmarkTap={onWordmarkTap}
        onMatches={() => setBrowser((b) => !b)}
      />

      <main className="grid min-h-0 flex-1 lg:grid-cols-[2fr_3fr]">
        <div
          className={`${tab === "ledger" ? "flex" : "hidden"} min-h-0 flex-col lg:flex lg:border-r lg:border-border`}
        >
          <Ledger events={events} highlightId={highlightId} teams={teams} empty={empty} />
        </div>
        <div
          className={`${tab === "fairness" ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}
        >
          <Fairness
            state={state}
            events={events}
            onHighlight={setHighlightId}
            teams={teams}
            replay={
              cfg.source === "history" && match
                ? { active: replaying, onToggle: onToggleReplay }
                : undefined
            }
          />
        </div>
      </main>

      <footer className="label shrink-0 truncate border-t border-border px-3 py-1.5">
        stream: {streamLabel} · last event: {lastEvent} · network: {network}
      </footer>

      <nav className="grid shrink-0 grid-cols-3 border-t border-border lg:hidden">
        <button
          onClick={() => setBrowser(true)}
          className="label min-h-11 cursor-pointer"
        >
          matches
        </button>
        {(["ledger", "fairness"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`label min-h-11 cursor-pointer ${
              tab === t ? "bg-panel text-text" : ""
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <Moments
        key={`${cfg.source}:${cfg.fixture ?? ""}:${cfg.speed}`}
        events={events}
        reduced={reduced}
      />
      <MatchBrowser
        open={browser}
        selectedId={cfg.source === "history" ? cfg.fixture : undefined}
        onSelect={onSelectMatch}
        onClose={() => setBrowser(false)}
        onLoaded={setWcMatches}
        reduced={reduced}
      />
      {drawer && (
        <Drawer
          cfg={cfg}
          onCfg={(patch) => setCfg((c) => ({ ...c, ...patch }))}
          connection={connection}
          network={network}
          fixtures={fixtures}
          onInject={onInject}
          onClose={() => setDrawer(false)}
          reduced={reduced}
        />
      )}
    </div>
  );
}
