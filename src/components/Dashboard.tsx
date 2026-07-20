"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import Ledger from "@/components/Ledger";
import Fairness from "@/components/Fairness";
import Drawer from "@/components/Drawer";
import MatchBrowser, { type WcMatch } from "@/components/MatchBrowser";
import MatchStrip from "@/components/MatchStrip";
import Moments from "@/components/Moments";
import { useMatchStream, type StreamConfig } from "@/hooks/useMatchStream";

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
  const [wcLoaded, setWcLoaded] = useState(false);
  const booted = useRef(false);
  const [cfg, setCfg] = useState<StreamConfig>({ source: "live", speed: 4 });
  const { events, state, connection, oddsSeries, oddsSimulated } = useMatchStream(cfg);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if ([...p.keys()].length === 0) return;
    booted.current = true;
    const speedParam = p.get("speed");
    setCfg({
      source: p.get("source") ?? "live",
      speed: speedParam === "instant" ? "instant" : Number(speedParam) || 4,
      name: p.get("name") ?? undefined,
      fixture: p.get("fixture") ?? undefined,
    });
  }, []);

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d: { matches: WcMatch[] }) => setWcMatches(d.matches ?? []))
      .catch(() => {})
      .finally(() => setWcLoaded(true));
    fetch("/api/fixtures")
      .then((r) => r.json())
      .then((d: { fixtures: FixtureInfo[] }) => setFixtures(d.fixtures ?? []))
      .catch(() => {});
  }, []);

  // start on the most recently played match unless the URL chose otherwise
  useEffect(() => {
    if (booted.current || !wcLoaded || wcMatches.length === 0) return;
    booted.current = true;
    const m = wcMatches[0];
    setCfg({ source: "history", speed: "instant", fixture: m.id, kickoff: m.startTime });
  }, [wcLoaded, wcMatches]);

  const activeId = cfg.fixture ?? undefined;
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
        : `REPLAY · ${cfg.name ?? "match"}`.toUpperCase();

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

  const onSelectMatch = useCallback((m: WcMatch) => {
    setCfg({ source: "history", speed: "instant", fixture: m.id, kickoff: m.startTime });
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
        ? "no live fixture · press m for world cup matches"
        : connection.status === "reconnecting"
          ? "stream unreachable · check TXLINE_API_TOKEN · retrying"
          : "connected · awaiting first decision"
      : cfg.source === "history"
        ? connection.status === "error"
          ? connection.message ?? "match record unavailable · check TXLINE_API_TOKEN"
          : connection.status === "reconnecting"
            ? "match record unavailable · retrying"
            : "loading match record…"
        : "awaiting first decision";

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        matchTitle={matchTitle}
        phase={`${state.phase}${state.minute !== null ? ` ${state.minute}'` : ""}`}
        live={connection.status === "open"}
        sourceLabel={cfg.source.toUpperCase()}
        score={match ? state.score : null}
        teams={teams}
        onMatches={() => setBrowser((b) => !b)}
        onControls={() => setDrawer((d) => !d)}
      />

      <MatchStrip
        matches={wcMatches}
        activeId={cfg.source === "history" ? cfg.fixture : undefined}
        onSelect={onSelectMatch}
        onExpand={() => setBrowser(true)}
        reduced={reduced}
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
            kickoff={match?.startTime}
            matchKey={`${cfg.source}:${cfg.fixture ?? ""}`}
            oddsSeries={oddsSeries}
            oddsSimulated={oddsSimulated}
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
            className={`label relative min-h-11 cursor-pointer ${
              tab === t ? "bg-panel text-text" : ""
            }`}
          >
            {t}
            {tab === t && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-3 bottom-1 h-0.5 bg-green"
              />
            )}
          </button>
        ))}
      </nav>

      <Moments
        key={`${cfg.source}:${cfg.fixture ?? ""}:${cfg.speed}`}
        events={events}
        teams={teams}
        reduced={reduced}
      />
      <MatchBrowser
        open={browser}
        matches={wcLoaded ? wcMatches : null}
        selectedId={cfg.source === "history" ? cfg.fixture : undefined}
        onSelect={onSelectMatch}
        onClose={() => setBrowser(false)}
        reduced={reduced}
      />
      {drawer && (
        <Drawer
          cfg={cfg}
          onCfg={(patch) => setCfg((c) => ({ ...c, ...patch }))}
          connection={connection}
          network={network}
          fixtures={fixtures}
          onClose={() => setDrawer(false)}
          reduced={reduced}
        />
      )}
    </div>
  );
}
