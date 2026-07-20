import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MatchSource, RawScore, RefEvent } from "../types";
import { playRaw } from "./play";

export function replaySource(name: string, speed: number): MatchSource {
  let inner: MatchSource | null = null;
  let closed = false;
  return {
    subscribe(cb: (e: RefEvent) => void) {
      const file = path.join(process.cwd(), "data", "replays", `${name}.json`);
      readFile(file, "utf8")
        .then((txt) => {
          if (closed) return;
          const messages = (JSON.parse(txt) as RawScore[])
            .slice()
            .sort((a, b) => a.seq - b.seq);
          inner = playRaw(messages, speed, true);
          inner.subscribe(cb);
        })
        .catch((e) => console.error(`replay ${name}:`, e.message));
    },
    close() {
      closed = true;
      inner?.close();
    },
  };
}
