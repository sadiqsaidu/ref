import type { MatchSource, Players, RefEvent } from "../types";
import { apiFetch, parseRecords, TxlineApiError } from "../txline/api";
import { aggregatePlayers, normalizeRaw } from "../txline/map";
import { playRaw } from "./play";

export function historySource(fixtureId: string, speed: number): MatchSource {
  let inner: MatchSource | null = null;
  let closed = false;
  return {
    subscribe(
      cb: (e: RefEvent) => void,
      onStatus?: (up: boolean) => void,
      onError?: (message: string) => void,
      onPlayers?: (players: Players) => void,
    ) {
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
          onPlayers?.(aggregatePlayers(records));
          inner = playRaw(records, speed, true);
          inner.subscribe(cb);
        })
        .catch((e) => {
          onStatus?.(false);
          console.error(`history ${fixtureId}:`, e instanceof Error ? e.message : e);
          onError?.(
            e instanceof TxlineApiError && (e.status === 401 || e.status === 403)
              ? `match record access denied (${e.status}) · renew or reactivate TXLINE_API_TOKEN, then restart the server`
              : `match record unavailable${e instanceof Error ? ` · ${e.message}` : ""}`,
          );
        });
    },
    close() {
      closed = true;
      inner?.close();
    },
  };
}
