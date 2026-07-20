"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Flag from "@/components/Flag";
import ThemeToggle from "@/components/ThemeToggle";
import type { MatchSummary } from "@/lib/matchSummary";

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function Landing({ summary }: { summary: MatchSummary | null }) {
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
            <HeroIllustration data={summary} />
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
              A crowd that reprices a match <em>after</em> a red card — not before —
              is evidence the call was not known in advance. REF reads consensus
              odds as an anti-conspiracy instrument: if the market only reacts once
              a decision is public, that is consistent with fair play. The app never
              places, brokers, or displays bets. Odds are used purely as a neutral,
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
    body: "A newest-first, immutable log of every call. Minute stamp, team, plain-language line, and a verification mark linking to the on-chain proof.",
  },
  {
    accent: "var(--amber)",
    glyph: "◫",
    title: "Fairness",
    body: "Both teams' discipline mirrored side by side — cards, foul proxy, corners, VAR — each shown as a percentile against tournament baselines.",
  },
  {
    accent: "var(--blue)",
    glyph: "◭",
    title: "Market Pulse",
    body: "Consensus win-probability over match time. Quantifies what each decision cost using the betting market as a neutral observer — zero betting.",
  },
];

function FeatureCards() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
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
            style={{
              borderColor: f.accent,
              background: `color-mix(in srgb, ${f.accent} 12%, transparent)`,
            }}
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
  ["01", "var(--green)", "Pick a match", "Open the dashboard — it starts on the most recent match. Switch competition in the top bar, or press M to browse the whole season by flag."],
  ["02", "var(--yellow)", "Read the ledger", "Scan every decision in order. Filter to CARDS, VAR, or GOALS. Green ✓ marks are anchored to on-chain proofs you can open."],
  ["03", "var(--amber)", "Check fairness & scorers", "See the discipline mirror, percentile chips, and who scored or got booked. On live matches, Market Pulse shows what each call cost."],
  ["04", "var(--blue)", "Replay it", "Hit ▶ REPLAY MATCH to watch the whole thing unfold as a highlight reel: rolling score, growing bars, and big-moment banners."],
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

const EVENT_ACCENT: Record<string, string> = {
  goal: "var(--green)",
  red: "var(--red)",
  second_yellow: "var(--red)",
  var_end: "var(--amber)",
};

function eventText(kind: string, detail: string): string {
  if (kind === "goal") return detail === "PENALTY" ? "GOAL · PENALTY" : "GOAL";
  if (kind === "red") return "RED CARD";
  if (kind === "second_yellow") return "SECOND YELLOW";
  if (kind === "var_end") return `VAR · ${detail.replace(/.*· /, "")}`;
  return detail;
}

function HeroIllustration({ data }: { data: MatchSummary | null }) {
  const failed = data === null;
  const t1 = data?.teams[1] ?? "Team A";
  const t2 = data?.teams[2] ?? "Team B";
  const c1 = t1.slice(0, 3).toUpperCase();
  const c2 = t2.slice(0, 3).toUpperCase();
  const rows = data?.keyEvents ?? [];

  return (
    <div className="overflow-hidden rounded-[4px] border border-border bg-panel">
      <div className="stripes flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex items-center overflow-hidden rounded-[4px] border border-border font-display text-xs font-bold">
          <span className="flex items-center gap-1 bg-amber px-1.5 py-0.5" style={{ color: "var(--panel)" }}>
            {c1}
          </span>
          <span className="px-2 tabular-nums">
            {data ? `${data.score[1]} : ${data.score[2]}` : "· : ·"}
          </span>
          <span className="bg-blue px-1.5 py-0.5" style={{ color: "var(--panel)" }}>
            {c2}
          </span>
        </span>
        <span className="label truncate">
          {failed ? "example" : `${t1} v ${t2}`}
        </span>
        <span className="label ml-auto">{data?.phase ?? "F"}</span>
      </div>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Flag name={t1} />
        <span className="min-w-0 flex-1 truncate font-display text-xs font-bold uppercase tracking-wide">
          {t1} <span className="text-muted">v</span> {t2}
        </span>
        <Flag name={t2} />
      </div>
      {rows.length > 0 ? (
        rows.map((e, i) => {
          const accent = EVENT_ACCENT[e.kind] ?? "var(--border)";
          const code = e.team === 1 ? c1 : e.team === 2 ? c2 : "";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.3 }}
              className="flex items-center gap-2 border-b border-border px-3 py-2 text-[11px]"
              style={{ borderLeft: `2px solid ${accent}` }}
            >
              <span
                className="-skew-x-6 rounded-[2px] px-1 text-[9px] font-bold"
                style={{
                  background: accent === "var(--border)" ? "transparent" : accent,
                  color: accent === "var(--border)" ? "var(--muted)" : "var(--panel)",
                }}
              >
                <span className="inline-block skew-x-6 tabular-nums">
                  {e.minute !== null ? `${e.minute}'` : "—"}
                </span>
              </span>
              {code && <span className="text-muted">{code}</span>}
              <span className="truncate">{eventText(e.kind, e.detail)}</span>
            </motion.div>
          );
        })
      ) : (
        failed && <div className="label p-4">example unavailable</div>
      )}
    </div>
  );
}
