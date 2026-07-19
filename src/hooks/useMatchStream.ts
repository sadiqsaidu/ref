"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { reduce } from "@/lib/reduce";
import type { RefEvent, Verify } from "@/lib/types";

export type Connection = "connecting" | "open" | "error";

export function useMatchStream(source: string, speed: number | "instant" = 1) {
  const [events, setEvents] = useState<RefEvent[]>([]);
  const [connection, setConnection] = useState<Connection>("connecting");
  const buffer = useRef<RefEvent[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEvents([]);
    setConnection("connecting");
    buffer.current = [];
    const es = new EventSource(`/api/stream?source=${source}&speed=${speed}`);
    es.onopen = () => setConnection("open");
    es.onerror = () => setConnection("error");

    const flush = () => {
      flushTimer.current = null;
      const added = buffer.current;
      buffer.current = [];
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const fresh = added.filter((e) => !seen.has(e.id));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    };
    es.addEventListener("ref", (m) => {
      buffer.current.push(JSON.parse((m as MessageEvent).data));
      flushTimer.current ??= setTimeout(flush, 50);
    });
    es.addEventListener("verify", (m) => {
      const { id, verify } = JSON.parse((m as MessageEvent).data) as {
        id: string;
        verify: Verify;
      };
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, verify } : e)));
    });

    return () => {
      es.close();
      if (flushTimer.current !== null) clearTimeout(flushTimer.current);
    };
  }, [source, speed]);

  const state = useMemo(() => reduce(events), [events]);
  return { events, state, connection };
}
