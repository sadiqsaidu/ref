import type { MatchSource, RawScore, RefEvent } from "../types";
import { eventKey } from "../eventKey";
import { apiFetch, parseSse } from "../txline/api";
import { createMapper } from "../txline/map";

export function liveSource(fixtureId: string): MatchSource {
  const ctrl = new AbortController();
  let closed = false;
  return {
    subscribe(cb: (e: RefEvent) => void, onStatus?: (up: boolean) => void) {
      const map = createMapper();
      const seen = new Set<string>();
      let lastEventId: string | undefined;
      (async () => {
        let backoff = 1000;
        while (!closed) {
          try {
            const res = await apiFetch(`/scores/stream?fixtureId=${fixtureId}`, {
              headers: {
                Accept: "text/event-stream",
                "Cache-Control": "no-cache",
                ...(lastEventId ? { "Last-Event-ID": lastEventId } : {}),
              },
              signal: ctrl.signal,
            });
            backoff = 1000;
            onStatus?.(true);
            for await (const msg of parseSse(res.body!)) {
              if (msg.id) lastEventId = msg.id;
              if (!msg.data || msg.event?.toLowerCase() === "heartbeat") continue;
              let raw: RawScore;
              try {
                raw = JSON.parse(msg.data) as RawScore;
              } catch {
                continue;
              }
              try {
                for (const e of map(raw)) {
                  const key = eventKey(e);
                  if (seen.has(key)) continue;
                  seen.add(key);
                  cb(e);
                }
              } catch (err) {
                console.error("map live record:", err instanceof Error ? err.message : err);
              }
            }
          } catch (e) {
            if (closed) return;
            onStatus?.(false);
            console.error("live stream:", e instanceof Error ? e.message : e);
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
