"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { FixtureInfo } from "@/components/Dashboard";
import type { Connection, StreamConfig } from "@/hooks/useMatchStream";
import type { RefKind } from "@/lib/types";

const SPEEDS: (number | "instant")[] = [1, 4, 16, "instant"];
const INJECTS: [string, RefKind][] = [
  ["YELLOW", "yellow"],
  ["RED", "red"],
  ["VAR OVERTURN", "var_start"],
  ["GOAL", "goal"],
];

export default function Drawer({
  cfg,
  onCfg,
  connection,
  network,
  fixtures,
  onInject,
  onClose,
  reduced,
}: {
  cfg: StreamConfig;
  onCfg: (patch: Partial<StreamConfig>) => void;
  connection: Connection;
  network: string;
  fixtures: FixtureInfo[];
  onInject: (kind: RefKind) => void;
  onClose: () => void;
  reduced: boolean;
}) {
  const [replays, setReplays] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/replays")
      .then((r) => r.json())
      .then(setReplays)
      .catch(() => setReplays([]));
  }, []);

  return (
    <motion.aside
      initial={reduced ? false : { x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col gap-4 overflow-y-auto border-l border-border bg-panel p-3"
    >
      <div className="flex items-center justify-between">
        <span className="label">Demo Controls</span>
        <button onClick={onClose} className="label min-h-11 cursor-pointer px-2 hover:text-text">
          ESC
        </button>
      </div>

      <div>
        <div className="label mb-1.5">Source</div>
        <div className="flex gap-1">
          {["live", "replay", "mock"].map((s) => (
            <button
              key={s}
              onClick={() => onCfg({ source: s })}
              className={`label min-h-11 flex-1 cursor-pointer border border-border ${
                cfg.source === s ? "bg-text !text-panel" : "hover:text-text"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="label mb-1.5">Replay File</div>
        <select
          value={cfg.name ?? ""}
          onChange={(e) => onCfg({ source: "replay", name: e.target.value })}
          className="label h-11 w-full cursor-pointer border border-border bg-panel px-2"
        >
          <option value="">{replays.length ? "select…" : "none recorded"}</option>
          {replays.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="label mb-1.5">Speed</div>
        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onCfg({ speed: s })}
              className={`label min-h-11 flex-1 cursor-pointer border border-border ${
                cfg.speed === s ? "bg-text !text-panel" : "hover:text-text"
              }`}
            >
              {s === "instant" ? "⏩" : `${s}x`}
            </button>
          ))}
        </div>
      </div>

      {fixtures.length > 0 && (
        <div>
          <div className="label mb-1.5">Today&apos;s Fixtures</div>
          <div className="flex max-h-40 flex-col overflow-y-auto border border-border">
            {fixtures.map((f) => (
              <button
                key={f.id}
                onClick={() => onCfg({ source: "live", fixture: f.id })}
                className={`label min-h-11 cursor-pointer truncate px-2 text-left ${
                  cfg.fixture === f.id ? "bg-text !text-panel" : "hover:text-text"
                }`}
              >
                {f.p1} v {f.p2}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="label mb-1.5">Fixture ID</div>
        <input
          value={cfg.fixture ?? ""}
          onChange={(e) => onCfg({ fixture: e.target.value.replace(/\D/g, "") })}
          placeholder="from env"
          className="h-11 w-full border border-border bg-panel px-2 text-xs tabular-nums"
        />
      </div>

      <div>
        <div className="label mb-1.5">Status</div>
        <div className="label flex flex-col gap-1 border border-border p-2">
          <span>network: {network}</span>
          <span>
            stream: {connection.status}
            {connection.status === "reconnecting" ? ` · attempt ${connection.attempt}` : ""}
          </span>
        </div>
      </div>

      <div>
        <div className="label mb-1.5">Inject Test Event</div>
        <div className="grid grid-cols-2 gap-1">
          {INJECTS.map(([label, kind]) => (
            <button
              key={kind}
              onClick={() => onInject(kind)}
              className="label min-h-11 cursor-pointer border border-border hover:text-text"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
