"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

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
              REF is a referee transparency dashboard for the World Cup. It keeps an
              immutable ledger of every officiating decision (cards, VAR reviews,
              penalties, disallowed goals) from a cryptographically signed data feed.
              Next to it you get fairness stats, a market impact read, and plain
              language AI analysis. The tone stays neutral and descriptive:
              percentiles, &ldquo;within normal range&rdquo;, &ldquo;unusual&rdquo;.
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

        <FeatureCards />

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-4"
        >
          <div className="overflow-hidden rounded-[4px] border border-blue">
            <div className="stripes flex items-center gap-1.5 border-b border-blue bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] px-4 py-2">
              <span className="size-1.5" style={{ background: "var(--blue)" }} />
              <span className="font-display text-xs font-bold uppercase tracking-wider text-blue">
                Why Market Pulse
              </span>
            </div>
            <p className="max-w-3xl p-4 text-sm leading-relaxed text-muted">
              When betting markets move <em>after</em> a major decision, like a red
              card or a VAR check, rather than <em>before</em> it, that is evidence
              the call was not leaked or predicted in advance. REF reads consensus
              odds as a neutral anti-conspiracy tool: if the market only reacts once a
              decision is public, that is consistent with fair play. The app never
              places, brokers, or displays bets. Odds are used purely as an
              independent measure of impact.
            </p>
          </div>
        </motion.section>

        <HowToUse />

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

const FEATURES = [
  {
    accent: "var(--green)",
    glyph: "▤",
    title: "Decision Ledger",
    body: "A simple, real-time log of every referee call. Minute stamps, the teams involved, a clear explanation, and a link to the on-chain proof.",
  },
  {
    accent: "var(--amber)",
    glyph: "◫",
    title: "Fairness View",
    body: "Compares both teams' disciplinary actions, cards, fouls and VAR checks, against historical World Cup benchmarks in plain language.",
  },
  {
    accent: "var(--blue)",
    glyph: "◭",
    title: "Market Pulse",
    body: "Shows win probability changes over the match, with no sports betting. It uses consensus odds as a neutral measure of whether a call was expected.",
  },
  {
    accent: "var(--red)",
    glyph: "✦",
    title: "AI Analyst",
    body: "An AI assistant trained on the Laws of the Game that breaks down the match calls and answers your questions in a live chat.",
  },
];

function FeatureCards() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          whileHover={{ y: -4 }}
          className="overflow-hidden rounded-[4px] border"
          style={{ borderColor: f.accent }}
        >
          <div
            className="stripes flex items-center gap-2 border-b px-3 py-2"
            style={{ borderColor: f.accent, background: `color-mix(in srgb, ${f.accent} 12%, transparent)` }}
          >
            <span className="font-display text-lg font-bold" style={{ color: f.accent }}>
              {f.glyph}
            </span>
            <span
              className="font-display text-sm font-bold uppercase tracking-wider"
              style={{ color: f.accent }}
            >
              {f.title}
            </span>
          </div>
          <p className="p-4 text-sm leading-relaxed text-muted">{f.body}</p>
        </motion.div>
      ))}
    </section>
  );
}

const STEPS: [string, string, string, string][] = [
  ["01", "var(--green)", "Pick a match", "Open the dashboard. It starts on the most recent match. Press M to browse the whole World Cup by flag."],
  ["02", "var(--yellow)", "Read the ledger", "Scan every decision in order. Filter to CARDS, VAR, or GOALS. Green ✓ marks are anchored to on-chain proofs."],
  ["03", "var(--amber)", "Ask the AI analyst", "See the discipline mirror, scorers, and market impact, then ask the AI analyst to explain any decision in plain language."],
  ["04", "var(--blue)", "Replay it", "Hit ▶ REPLAY MATCH to watch it unfold as a highlight reel: rolling score, growing bars, and big-moment banners."],
];

function HowToUse() {
  return (
    <section id="how" className="mt-16 scroll-mt-16">
      <h2 className="font-display text-2xl font-bold tracking-tight">How to use it</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {STEPS.map(([n, accent, title, body], i) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            whileHover={{ x: 4 }}
            className="flex h-full gap-4 rounded-[4px] border border-border p-4"
            style={{ borderLeft: `3px solid ${accent}` }}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-[4px] font-display text-sm font-bold"
              style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
            >
              {n}
            </span>
            <div>
              <div className="font-display text-sm font-bold uppercase tracking-wide">{title}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// original static illustration: decorative product mock, not live data
function HeroIllustration() {
  const rows: [string, string, string, string][] = [
    ["71'", "ARG", "RED CARD", "var(--red)"],
    ["58'", "ARG", "VAR · OVERTURNED", "var(--amber)"],
    ["24'", "ARG", "GOAL", "var(--green)"],
    ["11'", "EGY", "FREE KICK · DANGER", "var(--border)"],
  ];
  return (
    <div className="overflow-hidden rounded-[4px] border border-border bg-panel">
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
          {rows.map(([min, code, text, accent], i) => (
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
              <span className="text-muted">{code}</span>
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
    </div>
  );
}
