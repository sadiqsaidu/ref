"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme ?? "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      className="label h-11 w-14 cursor-pointer text-right hover:text-text"
      aria-label="Toggle theme"
    >
      {theme === null ? "····" : theme === "dark" ? "LIGHT" : "DARK"}
    </button>
  );
}
