"use client";

import { useState } from "react";
import TopBar from "@/components/TopBar";

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

export default function Home() {
  const [tab, setTab] = useState<"ledger" | "fairness">("ledger");

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        matchTitle="TEAM A v TEAM B · WORLD CUP FINAL"
        phase="H2 67'"
        live={false}
        sourceLabel="MOCK"
      />

      <main className="grid min-h-0 flex-1 lg:grid-cols-[2fr_3fr]">
        <div
          className={`${tab === "ledger" ? "flex" : "hidden"} min-h-0 flex-col lg:flex lg:border-r lg:border-border`}
        >
          <Panel title="Decision Ledger">
            <p className="text-xs text-muted">Awaiting events…</p>
          </Panel>
        </div>
        <div
          className={`${tab === "fairness" ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}
        >
          <Panel title="Fairness">
            <p className="text-xs text-muted">Awaiting data…</p>
          </Panel>
        </div>
      </main>

      <footer className="label shrink-0 truncate border-t border-border px-3 py-1.5">
        stream: disconnected · last event: — · network: devnet
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
