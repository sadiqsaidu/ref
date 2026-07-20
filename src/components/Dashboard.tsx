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
import { reduce } from "@/lib/reduce";

export type FixtureInfo = {
  id: string;
  p1: string;
  p2: string;
  competition: string;
  startTime: number;
};

export type Competition = { id: number; name: string; count: number; lastStart: number };

export type TeamMeta = Record<1 | 2, { code: string; name: string }>;

const FALLBACK_TEAMS: TeamMeta = {
  1: { code: "A", name: "Team A" },
  2: { code: "B", name: "Team B" },
};

const REPLAY_MS = 42_000;

export default function Dashboard({ network }: { network: string }) {
  const reduced = useReducedMotion() ?? false;
  const [tab, setTab] = useState<"ledger" | "fairness">("ledger");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [browser, setBrowser] = useState(false);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionId, setCompetitionId] = useState<number | null>(null);
  const [matchList, setMatchList] = useState<WcMatch[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const autoLoad = useRef(true);
  const [cfg, setCfg] = useState<StreamConfig>({ source: "live", speed: 4 });
  const { events, connection, oddsSeries, players } = useMatchStream(cfg);

  // client-side replay: reveal already-loaded events over ~42s (no re-fetch)
  const [replayCutoff, setReplayCutoff] = useState<number | null>(null);
  const [replayNonce, setReplayNonce] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  const displayEvents = useMemo(
    () => (replayCutoff === null ? events : events.filter((e) => e.ts <= replayCutoff)),
    [events, replayCutoff],
  );
  const state = useMemo(() => reduce(displayEvents), [displayEvents]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if ([...p.keys()].length === 0) return;
    autoLoad.current = false;
    const speedParam = p.get("speed");
    setCfg({
      source: p.get("source") ?? "live",
      speed: speedParam === "instant" ? "instant" : Number(speedParam) || 4,
      name: p.get("name") ?? undefined,
      fixture: p.get("fixture") ?? undefined,
    });
  }, []);

  useEffect(() => {
    fetch("/api/competitions")
      .then((r) => r.json())
      .then((d: { competitions: Competition[]; default: number | null }) => {
        setCompetitions(d.competitions ?? []);
        setCompetitionId((c) => c ?? d.default);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (competitionId === null) return;
    setListLoaded(false);
    fetch(`/api/matches?competition=${competitionId}`)
      .then((r) => r.json())
      .then((d: { matches: WcMatch[] }) => setMatchList(d.matches ?? []))
      .catch(() => setMatchList([]))
      .finally(() => setListLoaded(true));
  }, [competitionId]);

  // auto-load the most recent match of the selected competition
  useEffect(() => {
    if (!autoLoad.current || !listLoaded || matchList.length === 0) return;
    const m = matchList[0];
    setCfg({ source: "history", speed: "instant", fixture: m.id, kickoff: m.startTime });
  }, [listLoaded, matchList]);

  const activeId = cfg.fixture ?? undefined;
  const match = useMemo(
    () => (cfg.source === "history" ? matchList.find((m) => m.id === activeId) : undefined),
    [cfg.source, matchList, activeId],
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

  const selectMatch = useCallback((m: WcMatch) => {
    autoLoad.current = false;
    setReplayCutoff(null);
    setCfg({ source: "history", speed: "instant", fixture: m.id, kickoff: m.startTime });
    setBrowser(false);
  }, []);

  const onCompetition = useCallback((id: number) => {
    autoLoad.current = true;
    setReplayCutoff(null);
    setCompetitionId(id);
  }, []);

  const stopReplay = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
    setReplayCutoff(null);
  }, []);

  const toggleReplay = useCallback(() => {
    if (replayCutoff !== null) {
      stopReplay();
      return;
    }
    if (events.length < 2) return;
    const t0 = events[0].ts;
    const t1 = events[events.length - 1].ts;
    if (t1 <= t0) return;
    setReplayNonce((n) => n + 1);
    setReplayCutoff(t0);
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min((now - start) / REPLAY_MS, 1);
      setReplayCutoff(t0 + (t1 - t0) * k);
      if (k < 1) rafRef.current = requestAnimationFrame(step);
      else {
        rafRef.current = undefined;
        setReplayCutoff(null);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [replayCutoff, events, stopReplay]);

  useEffect(() => () => stopReplay(), [stopReplay]);

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
        ? "no live fixture · press m to browse matches"
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
        competitions={competitions}
        competitionId={competitionId}
        onCompetition={onCompetition}
        onMatches={() => setBrowser((b) => !b)}
        onControls={() => setDrawer((d) => !d)}
      />

      <MatchStrip
        matches={matchList}
        activeId={cfg.source === "history" ? cfg.fixture : undefined}
        onSelect={selectMatch}
        onExpand={() => setBrowser(true)}
        reduced={reduced}
      />

      <main className="grid min-h-0 flex-1 lg:grid-cols-[2fr_3fr]">
        <div
          className={`${tab === "ledger" ? "flex" : "hidden"} min-h-0 flex-col lg:flex lg:border-r lg:border-border`}
        >
          <Ledger events={displayEvents} highlightId={highlightId} teams={teams} empty={empty} />
        </div>
        <div
          className={`${tab === "fairness" ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}
        >
          <Fairness
            state={state}
            events={displayEvents}
            onHighlight={setHighlightId}
            teams={teams}
            players={players}
            highlightId={highlightId}
            kickoff={match?.startTime}
            matchKey={`${cfg.source}:${cfg.fixture ?? ""}`}
            oddsSeries={oddsSeries}
            replayActive={replayCutoff !== null}
            replayFrac={
              replayCutoff !== null && events.length > 1
                ? Math.max(
                    0,
                    Math.min(
                      1,
                      (replayCutoff - events[0].ts) /
                        (events[events.length - 1].ts - events[0].ts || 1),
                    ),
                  )
                : 0
            }
            replay={
              cfg.source === "history" && match && events.length > 1
                ? { active: replayCutoff !== null, onToggle: toggleReplay }
                : undefined
            }
          />
        </div>
      </main>

      <footer className="label shrink-0 truncate border-t border-border px-3 py-1.5">
        stream: {streamLabel} · last event: {lastEvent} · network: {network}
      </footer>

      <nav className="grid shrink-0 grid-cols-3 border-t border-border lg:hidden">
        <button onClick={() => setBrowser(true)} className="label min-h-11 cursor-pointer">
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
        key={`${cfg.source}:${cfg.fixture ?? ""}:${replayNonce}`}
        events={displayEvents}
        teams={teams}
        reduced={reduced}
        active={replayCutoff !== null}
      />
      <MatchBrowser
        open={browser}
        matches={listLoaded ? matchList : null}
        competitions={competitions}
        competitionId={competitionId}
        onCompetition={onCompetition}
        selectedId={cfg.source === "history" ? cfg.fixture : undefined}
        onSelect={selectMatch}
        onClose={() => setBrowser(false)}
        reduced={reduced}
      />
      {drawer && (
        <Drawer
          cfg={cfg}
          onCfg={(patch) => setCfg((c) => ({ ...c, ...patch }))}
          connection={connection}
          network={network}
          fixtures={matchList as unknown as FixtureInfo[]}
          onClose={() => setDrawer(false)}
          reduced={reduced}
        />
      )}
    </div>
  );
}
