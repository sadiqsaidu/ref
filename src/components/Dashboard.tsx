"use client";

import { useState } from "react";
import TopBar from "@/components/TopBar";
import Ledger from "@/components/Ledger";
import { useMatchStream } from "@/hooks/useMatchStream";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-panel">
      <div className="label shrink-0 border-b border-border px-3 py-2">
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </section>
  );
}

export default function Dashboard({ network }: { network: string }) {
  const [tab, setTab] = useState<"ledger" | "fairness">("ledger");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [cfg] = useState(() => {
    if (typeof window === "undefined") return { source: "mock", speed: 4 };
    const p = new URLSearchParams(window.location.search);
    const speedParam = p.get("speed");
    return {
      source: p.get("source") ?? "mock",
      speed: speedParam === "instant" ? ("instant" as const) : Number(speedParam) || 4,
    };
  });
  const { events, state, connection } = useMatchStream(cfg.source, cfg.speed);

  const lastEvent = state.lastTs
    ? new Date(state.lastTs).toLocaleTimeString([], { hour12: false })
    : "—";

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        matchTitle="TEAM A v TEAM B · WORLD CUP FINAL"
        phase={`${state.phase}${state.minute !== null ? ` ${state.minute}'` : ""}`}
        live={connection === "open"}
        sourceLabel={cfg.source.toUpperCase()}
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
          <Panel title="Fairness">
            <div className="bignum text-4xl">
              <span className="text-amber">{state.score[1]}</span>
              <span className="text-muted"> — </span>
              <span className="text-blue">{state.score[2]}</span>
            </div>
            <div className="label mt-4">
              yellows {state.teams[1].yellows}·{state.teams[2].yellows} · reds{" "}
              {state.teams[1].reds}·{state.teams[2].reds} · fouls proxy{" "}
              {state.teams[1].foulsProxy}·{state.teams[2].foulsProxy}
            </div>
          </Panel>
        </div>
      </main>

      <footer className="label shrink-0 truncate border-t border-border px-3 py-1.5">
        stream: {connection} · last event: {lastEvent} · network: {network}
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
    </div>
  );
}
