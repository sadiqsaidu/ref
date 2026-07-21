import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MatchSource, RefEvent } from "../types";
import { normalizeRaw, orderRecords } from "../txline/map";
import { playRaw } from "./play";

export function replaySource(name: string, speed: number): MatchSource {
  let inner: MatchSource | null = null;
  let closed = false;
  return {
    subscribe(
      cb: (e: RefEvent) => void,
      onStatus?: (up: boolean) => void,
      onError?: (message: string) => void,
    ) {
      const file = path.join(process.cwd(), "data", "replays", `${name}.json`);
      readFile(file, "utf8")
        .then((txt) => {
          if (closed) return;
          const messages = orderRecords(
            (JSON.parse(txt) as Record<string, unknown>[]).map(normalizeRaw),
          );
          if (messages.length === 0) throw new Error("replay file is empty");
          onStatus?.(true);
          inner = playRaw(messages, speed, true);
          inner.subscribe(cb);
        })
        .catch((e) => {
          const message = e instanceof Error ? e.message : String(e);
          console.error(`replay ${name}:`, message);
          onStatus?.(false);
          onError?.(`replay "${name}" unavailable · ${message}`);
        });
    },
    close() {
      closed = true;
      inner?.close();
    },
  };
}
