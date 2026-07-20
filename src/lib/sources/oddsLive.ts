import { normalizeOdds, type OddsTick } from "../odds";
import { apiFetch, parseSse } from "../txline/api";

// TODO: real TxLINE StablePrice odds-stream path. Paste the exact route from
// your `verify-endpoints` output here (e.g. `/odds/stream?fixtureId=${id}`).
// While this is empty the app uses the simulated walk (createOddsMock), clearly
// badged SIMULATED — nothing fake is ever presented as real consensus.
export const ODDS_STREAM_PATH = "";

// Field names the tick JSON is expected to expose. Adjust to match docs.yaml
// when wiring the real feed; only this file changes.
type RawOdds = {
  Ts?: number;
  Minute?: number;
  OddsHome?: number;
  OddsDraw?: number;
  OddsAway?: number;
  [k: string]: unknown;
};

const toMs = (t: number) => (t < 1e12 ? t * 1000 : t);

export function hasLiveOdds(): boolean {
  return ODDS_STREAM_PATH.length > 0;
}

export type OddsStream = {
  subscribe(cb: (t: OddsTick) => void, onStatus?: (up: boolean) => void): void;
  close(): void;
};

export function oddsLive(fixtureId: string): OddsStream {
  const ctrl = new AbortController();
  let closed = false;
  return {
    subscribe(cb, onStatus) {
      (async () => {
        let backoff = 1000;
        while (!closed) {
          try {
            const path = ODDS_STREAM_PATH.replace("${id}", fixtureId);
            const res = await apiFetch(path, {
              headers: { Accept: "text/event-stream", "Cache-Control": "no-cache" },
              signal: ctrl.signal,
            });
            backoff = 1000;
            onStatus?.(true);
            for await (const msg of parseSse(res.body!)) {
              if (!msg.data || msg.event?.toLowerCase() === "heartbeat") continue;
              const raw = JSON.parse(msg.data) as RawOdds;
              if (raw.OddsHome === undefined || raw.OddsAway === undefined) continue;
              const t = normalizeOdds(
                raw.OddsHome,
                raw.OddsDraw ?? null,
                raw.OddsAway,
                raw.Ts ? toMs(raw.Ts) : Date.now(),
                raw.Minute ?? 0,
              );
              if (t) cb(t);
            }
          } catch (e) {
            if (closed) return;
            onStatus?.(false);
            console.error("odds stream:", e instanceof Error ? e.message : e);
          }
          await new Promise((r) => setTimeout(r, backoff));
          backoff = Math.min(backoff * 2, 10000);
        }
      })();
    },
    close() {
      closed = true;
      ctrl.abort();
    },
  };
}
