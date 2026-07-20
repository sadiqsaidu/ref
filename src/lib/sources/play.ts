import type { MatchSource, RawScore, RefEvent } from "../types";
import { createMapper } from "../txline/map";

const toMs = (t: number) => (t < 1e12 ? t * 1000 : t);

export function playRaw(
  messages: RawScore[],
  speed: number,
  includeSecondary = false,
): MatchSource {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  return {
    subscribe(cb: (e: RefEvent) => void) {
      const map = createMapper(includeSecondary);
      let i = 0;
      const emit = () => {
        if (closed || i >= messages.length) return;
        for (const e of map(messages[i])) cb(e);
        i++;
        next();
      };
      const next = () => {
        if (closed || i >= messages.length) return;
        const delay =
          i === 0 ? 0 : (toMs(messages[i].ts) - toMs(messages[i - 1].ts)) / speed;
        timer = setTimeout(emit, Math.max(0, delay));
      };
      next();
    },
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
    },
  };
}
