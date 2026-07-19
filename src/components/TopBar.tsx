import ThemeToggle from "./ThemeToggle";

export default function TopBar({
  matchTitle,
  phase,
  live,
  sourceLabel,
}: {
  matchTitle: string;
  phase: string;
  live: boolean;
  sourceLabel: string;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 sm:gap-4 sm:px-4">
      <span className="text-sm font-bold tracking-[0.2em]">REF</span>
      <span className="hidden text-xs text-muted sm:inline">
        {matchTitle}
      </span>
      <span className="border border-border px-1.5 py-0.5 text-[11px] tabular-nums">
        {phase}
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <span
          className={`size-1.5 rounded-full ${
            live ? "live-dot bg-green" : "bg-muted"
          }`}
        />
        <span className="label">{live ? "LIVE" : "OFF"}</span>
        <span className="label hidden sm:inline" suppressHydrationWarning>
          · {sourceLabel}
        </span>
      </span>
      <ThemeToggle />
    </header>
  );
}
