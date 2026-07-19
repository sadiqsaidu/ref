"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import Ledger from "@/components/Ledger";
import Fairness from "@/components/Fairness";
import Drawer from "@/components/Drawer";
import Moments from "@/components/Moments";
import { useMatchStream, type StreamConfig } from "@/hooks/useMatchStream";
import type { RefEvent, RefKind } from "@/lib/types";

export default function Dashboard({ network }: { network: string }) {
  const reduced = useReducedMotion() ?? false;
  const [tab, setTab] = useState<"ledger" | "fairness">("ledger");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [cfg, setCfg] = useState<StreamConfig>(() => {
    if (typeof window === "undefined") return { source: "mock", speed: 4 };
    const p = new URLSearchParams(window.location.search);
    const speedParam = p.get("speed");
    return {
      source: p.get("source") ?? "mock",
      speed: speedParam === "instant" ? "instant" : Number(speedParam) || 4,
      name: p.get("name") ?? undefined,
      fixture: p.get("fixture") ?? undefined,
    };
  });
  const { events, state, connection, inject } = useMatchStream(cfg);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "d") setDrawer((d) => !d);
      if (e.key === "Escape") setDrawer(false);
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

  const lastEvent = state.lastTs
    ? new Date(state.lastTs).toLocaleTimeString([], { hour12: false })
    : "—";
  const streamLabel =
    connection.status === "reconnecting"
      ? `reconnecting · attempt ${connection.attempt}`
      : connection.status;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        matchTitle="TEAM A v TEAM B · WORLD CUP FINAL"
        phase={`${state.phase}${state.minute !== null ? ` ${state.minute}'` : ""}`}
        live={connection.status === "open"}
        sourceLabel={cfg.source.toUpperCase()}
        onWordmarkTap={onWordmarkTap}
      />

      <main className="grid min-h-0 flex-1 lg:grid-cols-[2fr_3fr]">
        <div
          className={`${tab === "ledger" ? "flex" : "hidden"} min-h-0 flex-col lg:flex lg:border-r lg:border-border`}
        >
          <Ledger events={events} highlightId={highlightId} />
        </div>
        <div
          className={`${tab === "fairness" ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}
        >
          <Fairness state={state} events={events} onHighlight={setHighlightId} />
        </div>
      </main>

      <footer className="label shrink-0 truncate border-t border-border px-3 py-1.5">
        stream: {streamLabel} · last event: {lastEvent} · network: {network}
      </footer>

      <nav className="grid shrink-0 grid-cols-2 border-t border-border lg:hidden">
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

      <Moments events={events} reduced={reduced} />
      {drawer && (
        <Drawer
          cfg={cfg}
          onCfg={(patch) => setCfg((c) => ({ ...c, ...patch }))}
          connection={connection}
          network={network}
          onInject={onInject}
          onClose={() => setDrawer(false)}
          reduced={reduced}
        />
      )}
    </div>
  );
}
