import type { MatchSource } from "@/lib/types";
import { liveSource } from "@/lib/sources/live";
import { mockSource } from "@/lib/sources/mock";
import { replaySource } from "@/lib/sources/replay";
import { verifyEvent } from "@/lib/verify";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const sourceName = p.get("source") ?? "live";
  const speedParam = p.get("speed");
  const speed =
    speedParam === "instant" ? Infinity : Math.max(Number(speedParam) || 1, 0.1);
  const name = (p.get("name") ?? "match").replace(/[^a-z0-9_-]/gi, "");
  const fixture = p.get("fixture") ?? process.env.TXLINE_FIXTURE_ID ?? "";

  if (sourceName === "live" && !fixture) {
    return Response.json({ error: "no fixture id configured" }, { status: 400 });
  }

  const source: MatchSource =
    sourceName === "live"
      ? liveSource(fixture)
      : sourceName === "replay"
        ? replaySource(name, speed)
        : mockSource(speed);

  const enc = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval>;
  const stream = new ReadableStream({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(enc.encode(chunk));
        } catch {}
      };
      write("retry: 3000\n\n");
      source.subscribe(
        (e) => {
          write(`id: ${e.id}\nevent: ref\ndata: ${JSON.stringify(e)}\n\n`);
          if (sourceName === "live") {
            verifyEvent(e).then((verify) => {
              if (verify.status !== "pending") {
                write(`event: verify\ndata: ${JSON.stringify({ id: e.id, verify })}\n\n`);
              }
            });
          }
        },
        (up) => write(`event: upstream\ndata: ${JSON.stringify({ up })}\n\n`),
      );
      heartbeat = setInterval(() => write(": hb\n\n"), 15000);
    },
    cancel() {
      clearInterval(heartbeat);
      source.close();
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
