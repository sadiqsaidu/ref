"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[4px] border border-border bg-panel ${className}`}>
      {children}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="stripes flex h-12 items-center gap-3 border-b border-border px-4">
        <span className="wordmark font-display text-base font-bold tracking-[0.18em]">
          REF
        </span>
        <span className="label hidden sm:inline">referee transparency</span>
        <span className="ml-auto flex items-center gap-3">
          <Link
            href="/app"
            className="label rounded-[4px] border border-green px-2.5 py-1 !text-green hover:bg-[color-mix(in_srgb,var(--green)_12%,transparent)]"
          >
            Launch →
          </Link>
          <ThemeToggle />
        </span>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24">
        {/* Hero */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="grid gap-8 py-16 lg:grid-cols-2 lg:items-center lg:py-24"
        >
          <div className="flex flex-col gap-5">
            <motion.span variants={fade} className="label">
              Live · verifiable · neutral
            </motion.span>
            <motion.h1
              variants={fade}
              className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
            >
              Every referee decision,
              <br />
              <span className="wordmark">on the record.</span>
            </motion.h1>
            <motion.p variants={fade} className="max-w-md text-sm leading-relaxed text-muted">
              REF is a referee-transparency dashboard. It shows an immutable ledger
              of every officiating decision — cards, penalties, VAR reviews,
              disallowed goals — from a cryptographically signed data feed, next to
              a fairness view that measures each match against tournament baselines.
              Descriptive, not accusatory: percentiles, &ldquo;within normal
              range&rdquo;, &ldquo;unusual&rdquo;.
            </motion.p>
            <motion.div variants={fade} className="flex flex-wrap gap-3">
              <Link
                href="/app"
                className="rounded-[4px] bg-green px-4 py-2.5 font-display text-sm font-bold tracking-wide"
                style={{ color: "var(--panel)" }}
              >
                Open the dashboard →
              </Link>
              <a
                href="#how"
                className="label rounded-[4px] border border-border px-4 py-2.5 hover:text-text"
              >
                How it works
              </a>
            </motion.div>
          </div>

          <motion.div variants={fade}>
            <HeroIllustration />
          </motion.div>
        </motion.section>

        {/* Features */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              accent: "var(--green)",
              title: "Decision Ledger",
              body: "A newest-first, immutable log of every call. Minute stamp, team, plain-language line, and a verification mark linking to the on-chain proof.",
            },
            {
              accent: "var(--amber)",
              title: "Fairness",
              body: "Both teams' discipline mirrored side by side — cards, foul proxy, corners, VAR — each shown as a percentile against tournament baselines.",
            },
            {
              accent: "var(--blue)",
              title: "Market Pulse",
              body: "Consensus win-probability over match time. Quantifies what each decision cost using the betting market as a neutral observer — zero betting features.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Panel className="row-hover h-full p-4">
                <div className="label mb-2 flex items-center gap-1.5">
                  <span className="size-1.5" style={{ background: f.accent }} />
                  {f.title}
                </div>
                <p className="text-sm leading-relaxed text-muted">{f.body}</p>
              </Panel>
            </motion.div>
          ))}
        </section>

        {/* Market Pulse framing */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-4"
        >
          <Panel className="p-5">
            <div className="label mb-2 flex items-center gap-1.5">
              <span className="size-1.5" style={{ background: "var(--blue)" }} />
              Why Market Pulse
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-muted">
              A crowd that reprices a match <em>after</em> a red card — not before —
              is evidence the call was not known in advance. REF reads consensus
              odds as an anti-conspiracy instrument: if the market only reacts once
              a decision is public, that is consistent with fair play. The app never
              places, brokers, or displays bets. Odds are used purely as a neutral,
              independent measure of impact.
            </p>
          </Panel>
        </motion.section>

        {/* How to use */}
        <section id="how" className="mt-16 scroll-mt-16">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            How to use it
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["01", "Pick a match", "Open the dashboard — it starts on the most recent match. Press M or tap MATCHES to browse the whole tournament by flag."],
              ["02", "Read the ledger", "Scan every decision in order. Filter to CARDS, VAR, or GOALS. Green ✓ marks are anchored to on-chain proofs you can open."],
              ["03", "Check fairness & pulse", "See the discipline mirror and percentile chips, then the Market Pulse chart — hover a decision marker to see what it cost in win-probability points."],
              ["04", "Replay it", "Hit ▶ REPLAY MATCH to watch the whole thing unfold as a highlight reel: rolling score, growing bars, and the market repricing live."],
            ].map(([n, title, body], i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <Panel className="flex h-full gap-4 p-4">
                  <span className="font-display text-2xl font-bold text-muted">{n}</span>
                  <div>
                    <div className="font-display text-sm font-bold uppercase tracking-wide">
                      {title}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                  </div>
                </Panel>
              </motion.div>
            ))}
          </div>
        </section>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-col items-center gap-4 text-center"
        >
          <p className="max-w-lg text-sm text-muted">
            Data anchored via TxLINE validation proofs on Solana. Fouls are the
            documented free-kick proxy. No credentials ever reach your browser.
          </p>
          <Link
            href="/app"
            className="rounded-[4px] bg-green px-5 py-3 font-display text-sm font-bold tracking-wide"
            style={{ color: "var(--panel)" }}
          >
            Open the dashboard →
          </Link>
        </motion.div>
      </main>
    </div>
  );
}

function HeroIllustration() {
  const rows: [string, string, string, string][] = [
    ["71'", "ARG", "RED CARD", "var(--red)"],
    ["58'", "ARG", "VAR · OVERTURNED", "var(--amber)"],
    ["24'", "ARG", "GOAL", "var(--green)"],
    ["11'", "EGY", "FREE KICK · DANGER", "var(--border)"],
  ];
  return (
    <Panel className="overflow-hidden">
      <div className="stripes flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex items-center overflow-hidden rounded-[4px] border border-border font-display text-xs font-bold">
          <span className="bg-amber px-1.5 py-0.5" style={{ color: "var(--panel)" }}>
            ARG
          </span>
          <span className="px-2 tabular-nums">2 : 1</span>
          <span className="bg-blue px-1.5 py-0.5" style={{ color: "var(--panel)" }}>
            EGY
          </span>
        </span>
        <span className="label">F · 90&apos;</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="live-dot size-1.5 rounded-full bg-green" />
          <span className="label">LIVE</span>
        </span>
      </div>
      <div className="grid grid-cols-2">
        <div className="border-r border-border">
          {rows.map(([min, team, text, accent], i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.3 }}
              className="flex items-center gap-2 border-b border-border px-2.5 py-2 text-[11px]"
              style={{ borderLeft: `2px solid ${accent}` }}
            >
              <span
                className="-skew-x-6 rounded-[2px] px-1 text-[9px] font-bold"
                style={{
                  background: accent === "var(--border)" ? "transparent" : accent,
                  color: accent === "var(--border)" ? "var(--muted)" : "var(--panel)",
                }}
              >
                <span className="inline-block skew-x-6 tabular-nums">{min}</span>
              </span>
              <span className="truncate">{text}</span>
            </motion.div>
          ))}
        </div>
        <div className="flex flex-col justify-center p-3">
          <div className="label mb-1 flex items-center gap-1.5">
            <span className="size-1.5 bg-green" />
            Market Pulse
          </div>
          <svg viewBox="0 0 120 60" className="w-full">
            {[15, 30, 45].map((yy) => (
              <line key={yy} x1="0" y1={yy} x2="120" y2={yy} stroke="var(--border)" strokeDasharray="2 3" />
            ))}
            <line x1="70" y1="0" x2="70" y2="60" stroke="var(--red)" strokeOpacity="0.5" />
            <motion.path
              d="M0 34 L20 32 L40 33 L55 24 L70 26 L72 40 L95 44 L120 46"
              fill="none"
              stroke="var(--amber)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, delay: 0.5 }}
            />
            <motion.path
              d="M0 30 L20 32 L40 31 L55 40 L70 38 L72 22 L95 18 L120 15"
              fill="none"
              stroke="var(--blue)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, delay: 0.5 }}
            />
          </svg>
          <div className="mt-1 flex justify-between">
            <span className="label !text-red">RED · −14 PTS</span>
            <span className="label">ARG</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
