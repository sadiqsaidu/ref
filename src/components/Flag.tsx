"use client";

import { useState } from "react";
import { flagUrl } from "@/lib/flags";

export default function Flag({ name, className = "h-3" }: { name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = flagUrl(name);
  if (!url || failed) {
    return (
      <span className="label inline-block border border-border px-0.5 !text-[9px] leading-3">
        {name.slice(0, 3).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={`${className} w-auto shrink-0 border border-border`}
      onError={() => setFailed(true)}
    />
  );
}
