# REF

Live referee-transparency dashboard for the World Cup final. An immutable ledger
of every officiating decision (cards, penalties, VAR reviews, disallowed goals)
streamed from TxLINE's cryptographically signed feed, next to a fairness panel
comparing both teams' discipline against tournament baselines. All copy is
descriptive and neutral: percentiles, "within normal range", "unusual", "rare".

## Local setup

Needs Node.js 20+ and npm. The default demo mode works without any API keys:

```bash
npm install
npm run dev        # http://localhost:3000 (or the next free port)
```

`npm run build && npm run start` for a production build. If packages are
missing, re-run `npm install`; stop the server with `Ctrl+C`.

## Mainnet free-tier setup (live data, optional)

1. Fund a Solana wallet with a little SOL for fees (mainnet-beta).
2. `ANCHOR_WALLET=~/.config/solana/id.json npx tsx scripts/activate-mainnet.ts`
   — subscribes on-chain (service level 12, 4 weeks, all leagues), activates,
   and prints your API token.
3. Copy `.env.example` to `.env.local`; paste the token into `TXLINE_API_TOKEN`
   and set `TXLINE_FIXTURE_ID` to the final's fixture id, then restart the dev
   server. Tokens stay server-side; the browser only ever sees normalized
   events.

## Pre-kickoff checklist

1. `npx tsx scripts/verify-endpoints.ts` — confirms every endpoint path we use
   exists in the published `docs.yaml`. Required: our paths were taken from a
   third-party SDK's source, not the spec itself.
2. `TXLINE_API_TOKEN=... npx tsx scripts/smoke-live.ts <fixtureId>` — watches
   the live stream for 30s and prints raw + normalized events.
3. `npx tsx scripts/record-replay.ts <fixtureId> <name>` — records a
   controversial past match into `data/replays/<name>.json` for the warm-up
   demo and as a realistic fallback.

## Demo-day runbook

- Open on `?source=replay&name=<match>&speed=16` and walk through the recorded
  controversy.
- At kickoff, open the demo drawer (`d`, or triple-tap the wordmark on mobile)
  and switch to LIVE with the final's fixture id.
- If the venue network or the feed misbehaves, switch to MOCK — a scripted
  8-minute dramatic match. The drawer can also inject single test events for
  rehearsal.

## Data notes

- Fouls are approximated by conceded free kicks with the documented
  `FreeKickType` danger levels — the feed's stated foul proxy. Labeled
  "FK CONCEDED · foul proxy" in the UI.
- "Anchored" marks come from TxLINE validation proofs for the fixture's stats
  (`/scores/stat-validation`), linking to the program on Solana explorer.
  Unavailable proofs degrade to "pending", never to a false check.
- Endpoint paths must be verified against `docs.yaml` before going live
  (`scripts/verify-endpoints.ts`); baselines in `data/baselines.json` are
  placeholders until regenerated from recorded tournament matches.
