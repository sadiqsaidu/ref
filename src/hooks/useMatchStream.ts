"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { eventKey } from "@/lib/eventKey";
import { reduce } from "@/lib/reduce";
import type { RefEvent, Verify } from "@/lib/types";

export type StreamConfig = {
  source: string;
  speed: number | "instant";
  name?: string;
  fixture?: string;
};

export type Connection = {
  status: "connecting" | "open" | "reconnecting" | "error";
  attempt: number;
  message?: string;
};

export function useMatchStream(cfg: StreamConfig) {
  const [events, setEvents] = useState<RefEvent[]>([]);
  const [connection, setConnection] = useState<Connection>({
    status: "connecting",
    attempt: 0,
  });
  const buffer = useRef<RefEvent[]>([]);
  const patches = useRef(new Map<string, Verify>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { source, speed, name, fixture } = cfg;
  useEffect(() => {
    setEvents([]);
    setConnection({ status: "connecting", attempt: 0 });
    buffer.current = [];
    const params = new URLSearchParams({ source, speed: String(speed) });
    if (name) params.set("name", name);
    if (fixture) params.set("fixture", fixture);
    const es = new EventSource(`/api/stream?${params}`);
    es.onopen = () => setConnection({ status: "open", attempt: 0 });
    es.onerror = () =>
      setConnection((c) =>
        es.readyState === EventSource.CLOSED
          ? { status: "error", attempt: c.attempt }
          : { status: "reconnecting", attempt: c.attempt + 1 },
      );

    const flush = () => {
      flushTimer.current = null;
      const added = buffer.current;
      buffer.current = [];
      const patch = patches.current;
      patches.current = new Map();
      setEvents((prev) => {
        const seen = new Set(prev.map(eventKey));
        const fresh = added.filter((e) => {
          const key = eventKey(e);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        let next = fresh.length ? [...prev, ...fresh] : prev;
        if (patch.size) {
          next = next.map((e) => {
            const verify = patch.get(e.id);
            return verify ? { ...e, verify } : e;
          });
        }
        return next;
      });
    };
    es.addEventListener("ref", (m) => {
      buffer.current.push(JSON.parse((m as MessageEvent).data));
      flushTimer.current ??= setTimeout(flush, 50);
    });
    es.addEventListener("upstream", (m) => {
      const { up } = JSON.parse((m as MessageEvent).data) as { up: boolean };
      setConnection((c) =>
        up
          ? { status: "open", attempt: 0 }
          : { status: "reconnecting", attempt: c.attempt + 1 },
      );
    });
    es.addEventListener("source-error", (m) => {
      const { message } = JSON.parse((m as MessageEvent).data) as { message: string };
      es.close();
      setConnection({ status: "error", attempt: 0, message });
    });
    es.addEventListener("verify", (m) => {
      const { id, verify } = JSON.parse((m as MessageEvent).data) as {
        id: string;
        verify: Verify;
      };
      patches.current.set(id, verify);
      flushTimer.current ??= setTimeout(flush, 50);
    });

    return () => {
      es.close();
      if (flushTimer.current !== null) clearTimeout(flushTimer.current);
    };
  }, [source, speed, name, fixture]);

  const inject = useCallback((injected: RefEvent[]) => {
    setEvents((prev) => [...prev, ...injected]);
  }, []);

  const state = useMemo(() => reduce(events), [events]);
  return { events, state, connection, inject };
}
