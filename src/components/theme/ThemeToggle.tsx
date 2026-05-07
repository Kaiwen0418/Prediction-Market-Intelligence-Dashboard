"use client";

import { useTheme } from "./ThemeProvider";

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 1.8v2.1M10 16.1v2.1M18.2 10h-2.1M3.9 10H1.8M15.8 4.2l-1.5 1.5M5.7 14.3l-1.5 1.5M15.8 15.8l-1.5-1.5M5.7 5.7 4.2 4.2" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M13.9 2.4a7.5 7.5 0 1 0 3.7 13.8A8 8 0 1 1 13.9 2.4Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-switch"
      aria-label={isDark ? "Switch to light mode" : "Switch to night mode"}
      aria-pressed={isDark}
    >
      <span className="theme-switch-track">
        <span className="theme-switch-icon">
          <SunIcon />
        </span>
        <span className="theme-switch-icon">
          <MoonIcon />
        </span>
        <span className="theme-switch-thumb" />
      </span>
    </button>
  );
}
