"use client";

import { SunMoon } from "lucide-react";

type Theme = "dark" | "light";

function detectTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem("theme");
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export default function ThemeToggle() {
  const toggleTheme = () => {
    const theme = detectTheme();
    const updatedTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = updatedTheme;
    window.localStorage.setItem("theme", updatedTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-md border border-border px-2.5 py-1.5 text-muted transition-colors hover:text-accent-light"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className="inline-flex items-center gap-1.5 text-sm">
        <SunMoon size={16} />
      </span>
    </button>
  );
}
