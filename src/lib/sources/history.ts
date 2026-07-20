import type { MatchSource, RawScore, RefEvent } from "../types";
import { apiFetch } from "../txline/api";
import { playRaw } from "./play";

export function historySource(fixtureId: string, speed: number): MatchSource {
  let inner: MatchSource | null = null;
  let closed = false;
  return {
    subscribe(cb: (e: RefEvent) => void, onStatus?: (up: boolean) => void) {
      apiFetch(`/scores/historical/${fixtureId}`)
        .then((r) => r.json())
        .then((records: RawScore[]) => {
          if (closed) return;
          onStatus?.(true);
          inner = playRaw(
            records.slice().sort((a, b) => a.seq - b.seq),
            speed,
          );
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
