"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export type AnalystContext = {
  teams: { 1: string; 2: string };
  score: { 1: number; 2: number };
  phase: string;
  minute: number | null;
  discipline: Record<string, [number, number]>;
  var: { for: [number, number]; against: [number, number]; overturned: [number, number] };
  scorers: { team: string; players: string[] }[];
  decisions: { minute: number | null; team: string | null; text: string }[];
};

type Msg = { role: "user" | "assistant"; content: string };

const SUMMARY_PROMPT =
  "Give me a short, plain-language summary of this match — the story, the key decisions, and whether anything was unusual for a referee to call.";

const SUGGESTIONS = [
  "Explain the VAR decision",
  "Was this a card-heavy match?",
  "Anything unusual about the officiating?",
  "Who were the key players?",
];

export default function AiAnalyst({
  context,
  matchKey,
}: {
  context: AnalystContext;
  matchKey: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const ctxRef = useRef(context);
  ctxRef.current = context;
  const scrollRef = useRef<HTMLDivElement>(null);

  // reset when the match changes
  useEffect(() => {
    setMessages([]);
    setInput("");
    setError(null);
    setStarted(false);
  }, [matchKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  async function send(text: string, hideUser = false) {
    if (loading || !text.trim()) return;
    setError(null);
    setLoading(true);
    const outgoing: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(hideUser ? messages : outgoing);
    try {
      const res = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: ctxRef.current, messages: outgoing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "request failed");
      setMessages([...outgoing, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages(outgoing);
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setLoading(false);
    }
  }

  const begin = () => {
    setStarted(true);
    send(SUMMARY_PROMPT, true);
  };

  // conversation shown to the user hides the synthetic summary prompt
  const visible = messages.filter(
    (m, i) => !(i === 0 && m.role === "user" && m.content === SUMMARY_PROMPT),
  );

  return (
    <div className="rounded-[4px] border border-blue">
      <div className="flex items-center gap-1.5 border-b border-blue bg-[color-mix(in_srgb,var(--blue)_10%,transparent)] px-3 py-1.5">
        <span className="size-1.5 rounded-full bg-blue" />
        <span className="font-display text-[11px] font-bold uppercase tracking-wider text-blue">
          AI Analyst
        </span>
        <span className="label ml-auto !normal-case !tracking-normal">
          referee &amp; rules, in plain words
        </span>
      </div>

      {!started ? (
        <div className="flex flex-col items-start gap-2 p-3">
          <p className="text-xs leading-relaxed text-muted">
            Ask an AI that knows the Laws of the Game to explain this match&apos;s
            decisions in plain language — then follow up with your own questions.
          </p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={begin}
            className="rounded-[4px] bg-blue px-3 py-1.5 font-display text-xs font-bold tracking-wide"
            style={{ color: "var(--panel)" }}
          >
            Analyse this match →
          </motion.button>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex max-h-72 flex-col gap-2 overflow-y-auto p-3">
            {visible.map((m, i) => (
              <div
                key={i}
                className={`max-w-[92%] rounded-[6px] px-2.5 py-1.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "self-end bg-[color-mix(in_srgb,var(--blue)_16%,transparent)]"
                    : "self-start border border-border"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="self-start">
                <span className="pulse-soft label">analysing…</span>
              </div>
            )}
            {error && (
              <div className="label !text-red !normal-case !tracking-normal">{error}</div>
            )}
          </div>

          {visible.length > 0 && !loading && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="label rounded-[4px] border border-border px-1.5 py-0.5 hover:border-blue hover:!text-blue"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
              setInput("");
            }}
            className="flex gap-1.5 border-t border-border p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this match…"
              className="h-9 min-w-0 flex-1 rounded-[4px] border border-border bg-panel px-2 text-xs"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-[4px] bg-blue px-3 font-display text-xs font-bold disabled:opacity-40"
              style={{ color: "var(--panel)" }}
            >
              Ask
            </button>
          </form>
        </>
      )}
    </div>
  );
}
