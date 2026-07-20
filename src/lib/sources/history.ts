import type { MatchSource, RefEvent } from "../types";
import { apiFetch, parseRecords } from "../txline/api";
import { normalizeRaw } from "../txline/map";
import { playRaw } from "./play";

export function historySource(fixtureId: string, speed: number): MatchSource {
  let inner: MatchSource | null = null;
  let closed = false;
  return {
    subscribe(cb: (e: RefEvent) => void, onStatus?: (up: boolean) => void) {
      apiFetch(`/scores/historical/${fixtureId}`)
        .then((r) => r.text())
        .then((text) => {
          if (closed) return;
          const records = (parseRecords(text) as Record<string, unknown>[])
            .map(normalizeRaw)
            .filter((r) => typeof r.seq === "number")
            .sort((a, b) => a.seq - b.seq);
          if (records.length === 0) throw new Error("no score records in response");
          onStatus?.(true);
          inner = playRaw(records, speed);
          inner.subscribe(cb);
        })
        .catch((e) => {
          onStatus?.(false);
          console.error(`history ${fixtureId}:`, e instanceof Error ? e.message : e);
        });
    },
    close() {
      closed = true;
      inner?.close();
    },
  };
}
