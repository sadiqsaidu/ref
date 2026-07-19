# REF — project conventions

- Minimal code. No comments except where logic is genuinely non-obvious (target: near zero).
- No over-engineering: no unnecessary abstractions, no barrel files, no premature generics, no config for things that don't vary.
- Low latency is a feature: prefer streaming over polling, memoize expensive renders, no rerender storms.
- All external credentials stay server-side. The browser never sees API tokens.
- Descriptive, neutral language in all UI copy. The app never says "bias" or "rigged" — it says "percentile", "within normal range", "unusual".
