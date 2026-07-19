# REF local setup

This project is a Next.js app. The default demo mode works without any API keys, so you can get it running locally in a few steps.

## Prerequisites

- Node.js 20 or newer
- npm

## 1. Install dependencies

From the project root, run:

```bash
npm install
```

## 2. Start the app locally

```bash
npm run dev
```

Then open:

- http://localhost:3000

If port 3000 is already in use, Next.js will usually choose the next available port and print the new URL in the terminal.

## 3. Build for production (optional)

```bash
npm run build
npm run start
```

## Optional: enable live data

The app can also use live TXLine data. That is optional. If you want to try it, create a file named `.env.local` in the project root with values like:

```bash
TXLINE_FIXTURE_ID=your-fixture-id
TXLINE_API_ORIGIN=https://txline.txodds.com
TXLINE_API_TOKEN=your-token
TXLINE_NETWORK=mainnet
```

Then restart the dev server.

## Troubleshooting

- If you see missing package errors, run `npm install` again.
- If the app does not start, make sure you are in the project folder and that Node.js is installed.
- To stop the local server, press `Ctrl+C` in the terminal.
