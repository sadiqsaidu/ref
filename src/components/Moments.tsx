"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { RefEvent } from "@/lib/types";

type Moment = { key: string; type: "red" | "overturn" };

export default function Moments({
  events,
  reduced,
}: {
  events: RefEvent[];
  reduced: boolean;
}) {
  const seen = useRef(0);
  const mounted = useRef(Date.now());
  const [moments, setMoments] = useState<Moment[]>([]);

  useEffect(() => {
    const fresh = events.slice(seen.current);
    seen.current = events.length;
    // suppress choreography while catching up on a stream's backlog
    if (reduced || Date.now() - mounted.current < 1500) return;
    const add: Moment[] = [];
    for (const e of fresh) {
      if (e.kind === "red" || e.kind === "second_yellow") add.push({ key: e.id, type: "red" });
      if (e.kind === "var_end" && e.detail.includes("OVERTURNED"))
        add.push({ key: e.id, type: "overturn" });
    }
    if (!add.length) return;
    setMoments((m) => [...m, ...add]);
    for (const a of add) {
      setTimeout(
        () => setMoments((m) => m.filter((x) => x.key !== a.key)),
        a.type === "red" ? 1100 : 1900,
      );
    }
  }, [events, reduced]);

  return (
    <AnimatePresence>
      {moments.map((m) =>
        m.type === "red" ? (
          <svg
            key={m.key}
            className="pointer-events-none fixed inset-0 z-40 size-full"
          >
            <motion.rect
              x="1"
              y="1"
              width="99%"
              height="99%"
              fill="none"
              stroke="var(--red)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: 1, opacity: [1, 1, 0] }}
              transition={{
                pathLength: { duration: 0.7, ease: "easeInOut" },
                opacity: { duration: 1, times: [0, 0.8, 1] },
              }}
            />
          </svg>
        ) : (
          <div key={m.key} className="pointer-events-none fixed inset-0 z-40">
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.6, times: [0, 0.3, 1] }}
              style={{
                boxShadow: "inset 0 0 70px color-mix(in srgb, var(--amber) 35%, transparent)",
              }}
            />
            <motion.div
              className="label absolute left-1/2 top-1/3 border-2 px-4 py-2 !text-sm"
              style={{ borderColor: "var(--amber)", color: "var(--amber)", background: "var(--panel)" }}
              initial={{ x: "-50%", scale: 1.7, opacity: 0 }}
              animate={{
                x: ["-50%", "-50%", "-50%", "-150%"],
                scale: [1.7, 1, 1, 0.85],
                opacity: [0, 1, 1, 0],
              }}
              transition={{ duration: 1.8, times: [0, 0.2, 0.75, 1] }}
            >
              Overturned
            </motion.div>
          </div>
        ),
      )}
    </AnimatePresence>
  );
}
