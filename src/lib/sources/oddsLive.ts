import { normalizeOdds, type OddsTick } from "../odds";
import { apiFetch, parseSse } from "../txline/api";

// Real TxLINE StablePrice odds stream (per the published SDK). Live matches
// only — completed matches have no direct historical-odds endpoint.
export const ODDS_STREAM_PATH = "/odds/stream?fixtureId=${id}";

// StablePrice payload: a bookmaker line with PriceNames + decimal Prices.
type RawOdds = {
  Ts?: number;
  Minute?: number;
  InRunning?: boolean;
  SuperOddsType?: string;
  MarketPeriod?: string;
  PriceNames?: string[];
  Prices?: number[];
  [k: string]: unknown;
};

const toMs = (t: number) => (t < 1e12 ? t * 1000 : t);
const HOME = /^(1|home|h)$/i;
const DRAW = /^(x|draw|d|tie)$/i;
const AWAY = /^(2|away|a)$/i;

// pull the 3-way match-odds line (home/draw/away decimals) from a tick
function matchOdds(raw: RawOdds): [number, number, number] | null {
  const names = raw.PriceNames;
  const prices = raw.Prices;
  if (!names || !prices || names.length !== prices.length) return null;
  let h: number | undefined;
  let d: number | null = null;
  let a: number | undefined;
  for (let i = 0; i < names.length; i++) {
    if (HOME.test(names[i])) h = prices[i];
    else if (DRAW.test(names[i])) d = prices[i];
    else if (AWAY.test(names[i])) a = prices[i];
  }
  if (h === undefined || a === undefined) {
    // fall back to positional [home, draw, away] / [home, away]
    if (prices.length === 3) return [prices[0], prices[1], prices[2]];
    if (prices.length === 2) return [prices[0], Number.NaN, prices[1]];
    return null;
  }
  return [h, d ?? Number.NaN, a];
}

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
              const odds = matchOdds(raw);
              if (!odds) continue;
              const [h, d, a] = odds;
              const t = normalizeOdds(
                h,
                Number.isNaN(d) ? null : d,
                a,
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
