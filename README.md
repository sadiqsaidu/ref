# REF

Live referee-transparency dashboard for the World Cup final. REF shows an
immutable ledger of every officiating decision (cards, penalties, VAR reviews,
disallowed goals) streamed from TxLINE's cryptographically signed data feed,
next to a fairness panel comparing both teams' discipline against tournament
baselines. All copy is descriptive and neutral: percentiles,
"within normal range", "unusual", "rare".

The screen is split into two panels:

- **DECISION LEDGER** (left / LEDGER tab on mobile) — newest-first list of
  every decision with minute stamps, team tags, severity accents, live VAR
  review pairing, and a verification mark per entry (pending ○ / anchored ✓
  linking to Solana explorer / failed ×).
- **FAIRNESS** (right / FAIRNESS tab) — scoreline, mirror bar charts for
  yellows, reds, fouls proxy, dangerous free kicks, corners and VAR counts, a
  VAR summary box, percentile chips against tournament baselines, an
  auto-composed verdict line, and a clickable match timeline.

## Prerequisites

- **Node.js 20 or newer** (`node -v` to check)
- **npm** (ships with Node)

Everything below is run from the project root.

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** — the app starts in **LIVE mode**: it
streams the fixture from `TXLINE_FIXTURE_ID` (or one picked in the demo
drawer), resolves real team names from the day's fixture list, and shows an
honest stream status in the footer until credentials are configured (see
below). For a zero-configuration rehearsal there is still a scripted match at
`http://localhost:3000/?source=mock` — it is never shown unless explicitly
requested.

The dev and production servers are both **pinned to port 3000**. If the port
is taken, the command fails with `EADDRINUSE` instead of silently moving to
another port — see troubleshooting below.

### Production build

```bash
npm run build
npm run start     # serves the built app on http://localhost:3000
```

`npm run start` requires a completed `npm run build` first; without one it
exits with an error and nothing will be listening.

## Troubleshooting: "This site can't be reached" / ERR_CONNECTION_REFUSED

This error means **nothing is listening on the URL you opened**. The usual
causes, in order of likelihood:

1. **Wrong port in the browser.** Older versions of this project let the dev
   server silently fall back to port 3001 when 3000 was busy; a browser
   pointed at `localhost:3001` then fails on every later run. Both scripts are
   now pinned to **3000** — always open the exact URL printed under
   `- Local:` in the terminal.
2. **A stale server is still holding port 3000.** The startup then fails with
   `EADDRINUSE` (nothing starts). Find and kill it:
   - Windows: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`
   - macOS/Linux: `lsof -i :3000` then `kill <pid>`
   Note the process is named `next-server`, not `npm`.
3. **`npm run start` without a build.** It prints an error and exits — run
   `npm run build` first.
4. **The terminal shows a crash.** Whatever is printed there (missing
   packages → `npm install`; syntax error → fix it) is the real cause; the
   browser error is just the symptom.

## Browsing World Cup matches

Press **`m`** (or the MATCHES button in the top bar / bottom tab on mobile)
to open the World Cup 2026 match browser. It lists every tournament fixture
with country flags; selecting one loads the full match record from TxLINE's
historical endpoint — complete decision ledger, discipline stats, and
verification marks appear instantly, with a **▶ REPLAY MATCH** button in the
fairness header that plays the match back as a ~45-second highlight reel
(score digits roll, bars grow, big moments fire). No `TXLINE_FIXTURE_ID`
needed — that variable is now only an optional default for LIVE mode.

Flags are loaded from flagcdn.com; teams without a mapped flag fall back to a
three-letter code chip.

## Demo modes and URL parameters

The stream source is chosen per-URL:

| Parameter | Values                                  | Default | Meaning                                       |
| --------- | --------------------------------------- | ------- | --------------------------------------------- |
| `source`  | `live` / `history` / `replay` / `mock`  | `live`  | TxLINE stream / past match / file / scripted  |
| `speed`   | `1`, `4`, `16`, `150`, `instant`        | `4`     | playback multiplier (history, replay, mock)   |
| `name`    | replay file name                        | `match` | reads `data/replays/<name>.json`              |
| `fixture` | numeric fixture id                      | env     | fixture for `live` and `history`              |

Example: `http://localhost:3000/?source=replay&name=semifinal&speed=16`

**Demo drawer**: press **`d`** (desktop) or **triple-tap the REF wordmark**
(mobile) to open the hidden control drawer — switch source, pick from today's
fixtures or type a fixture id, choose a replay file and speed, see
network/connection state, and inject
single test events (yellow, red, VAR overturn, goal) to rehearse the
choreography. `Esc` closes it.

## Environment variables (.env.local)

Required for LIVE data (the default mode) and verification. Copy the template
and fill it in:

```bash
cp .env.example .env.local
```

| Variable            | Example                      | Purpose                                        |
| ------------------- | ---------------------------- | ---------------------------------------------- |
| `TXLINE_API_ORIGIN` | `https://txline.txodds.com`  | TxLINE API host (default: mainnet)             |
| `TXLINE_NETWORK`    | `mainnet` or `devnet`        | drives explorer links + footer label           |
| `TXLINE_API_TOKEN`  | `…`                          | your activated API token (see below)           |
| `TXLINE_FIXTURE_ID` | `17952170`                   | optional: default fixture for LIVE mode        |

Restart the dev server after changing `.env.local`. All credentials stay
server-side — the browser only ever receives normalized events.

## Getting a TxLINE API token (mainnet free tier)

TxLINE access is activated by an on-chain Solana subscription tied to your
wallet:

1. Have a Solana wallet keyfile (e.g. `~/.config/solana/id.json`) with a
   small amount of SOL on mainnet-beta for transaction fees.
2. Run the one-shot activation script:

   ```bash
   ANCHOR_WALLET=~/.config/solana/id.json npx tsx scripts/activate-mainnet.mts
   ```

   It subscribes on-chain (service level 12, 4 weeks, all leagues), fetches a
   guest JWT, signs the activation preimage with your wallet, calls
   `/api/token/activate`, and prints `TXLINE_API_TOKEN`. It fails loudly on
   any network/host mismatch (non-mainnet RPC, wrong API origin, empty
   wallet).
3. Paste the printed token into `TXLINE_API_TOKEN` in `.env.local`, set
   `TXLINE_FIXTURE_ID`, restart, and open `?source=live`.

## Operations scripts

All run with `npx tsx` (downloaded on demand):

| Script                        | Command                                                             | What it does                                                        |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `scripts/verify-endpoints.mts` | `npx tsx scripts/verify-endpoints.mts`                               | checks every API path we use against the published `docs.yaml`, ✓/✗ table, non-zero exit on a miss |
| `scripts/smoke-live.mts`       | `TXLINE_API_TOKEN=… npx tsx scripts/smoke-live.mts <fixtureId> [s]`  | streams live scores for 30s, prints raw + normalized events          |
| `scripts/record-replay.mts`    | `npx tsx scripts/record-replay.mts <fixtureId> <name>`               | saves a past match to `data/replays/<name>.json` for replay mode     |
| `scripts/activate-mainnet.mts` | see previous section                                                | one-shot mainnet subscription + token activation                     |

## Pre-kickoff checklist

1. `npx tsx scripts/verify-endpoints.mts` — required: our endpoint paths were
   taken from a third-party SDK's source, not the spec itself.
2. `TXLINE_API_TOKEN=… npx tsx scripts/smoke-live.mts <fixtureId>` — confirm
   real data flows.
3. `npx tsx scripts/record-replay.mts <fixtureId> <name>` — record a
   controversial past match for the warm-up demo and as a realistic fallback.

## Demo-day runbook

- Open on `?source=replay&name=<match>&speed=16` and walk through the
  recorded controversy.
- At kickoff, open the demo drawer and switch to LIVE with the final's
  fixture id.
- If the venue network or the feed misbehaves, switch to MOCK. The drawer's
  inject buttons are for rehearsal only.

## Data notes

- Fouls are approximated by conceded free kicks with the documented
  `FreeKickType` danger levels — the feed's stated foul proxy. Labeled
  "FK CONCEDED · foul proxy" in the UI.
- "Anchored" marks come from TxLINE validation proofs for the fixture's stats
  (`/scores/stat-validation`), linking to the program on Solana explorer.
  Unavailable proofs degrade to "pending", never to a false check.
- Baselines in `data/baselines.json` are placeholder distributions until
  regenerated from recorded tournament matches.
