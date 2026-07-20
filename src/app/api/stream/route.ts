import type { MatchSource, RefKind } from "@/lib/types";
import { historySource } from "@/lib/sources/history";
import { liveSource } from "@/lib/sources/live";
import { replaySource } from "@/lib/sources/replay";
import { oddsLive, hasLiveOdds } from "@/lib/sources/oddsLive";
import { verifyEvent } from "@/lib/verify";

export const dynamic = "force-dynamic";

const VERIFIABLE: RefKind[] = [
  "goal", "yellow", "red", "second_yellow", "corner", "penalty_outcome",
];

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const sourceName = p.get("source") ?? "live";
  const speedParam = p.get("speed");
  const speed =
    speedParam === "instant" ? Infinity : Math.max(Number(speedParam) || 1, 0.1);
  const name = (p.get("name") ?? "match").replace(/[^a-z0-9_-]/gi, "");
  const fixture = p.get("fixture") ?? process.env.TXLINE_FIXTURE_ID ?? "";

  if ((sourceName === "live" || sourceName === "history") && !fixture) {
    return Response.json({ error: "no fixture id configured" }, { status: 400 });
  }

  const source: MatchSource =
    sourceName === "live"
      ? liveSource(fixture)
      : sourceName === "history"
        ? historySource(fixture, speedParam ? speed : Infinity)
        : replaySource(name, speed);

  const verifiable = sourceName === "live" || sourceName === "history";
  // real consensus odds are only meaningful for an in-progress match
  const oddsStream = sourceName === "live" && hasLiveOdds() ? oddsLive(fixture) : null;

  let running = 0;
  const queue: (() => void)[] = [];
  const schedule = (fn: () => Promise<void>) => {
    const go = () => {
      running++;
      fn().finally(() => {
        running--;
        queue.shift()?.();
      });
    };
    if (running < 6) go();
    else queue.push(go);
  };

  const enc = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval>;
  const stream = new ReadableStream({
    start(controller) {
      let ended = false;
      const write = (chunk: string) => {
        if (ended) return;
        try {
          controller.enqueue(enc.encode(chunk));
        } catch {}
      };
      write("retry: 3000\n\n");

      source.subscribe(
        (e) => {
          write(`id: ${e.id}\nevent: ref\ndata: ${JSON.stringify(e)}\n\n`);
          if (verifiable && VERIFIABLE.includes(e.kind)) {
            schedule(() =>
              verifyEvent(e, fixture).then((verify) => {
                if (verify.status !== "pending") {
                  write(`event: verify\ndata: ${JSON.stringify({ id: e.id, verify })}\n\n`);
                }
              }),
            );
          }
        },
        (up) => write(`event: upstream\ndata: ${JSON.stringify({ up })}\n\n`),
        (message) => {
          write(`event: source-error\ndata: ${JSON.stringify({ message })}\n\n`);
          ended = true;
          clearInterval(heartbeat);
          source.close();
          oddsStream?.close();
          try {
            controller.close();
          } catch {}
        },
        (players) => write(`event: players\ndata: ${JSON.stringify(players)}\n\n`),
      );

      oddsStream?.subscribe((t) => write(`event: odds\ndata: ${JSON.stringify(t)}\n\n`));
      heartbeat = setInterval(() => write(": hb\n\n"), 15000);
    },
    cancel() {
      clearInterval(heartbeat);
      source.close();
      oddsStream?.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
