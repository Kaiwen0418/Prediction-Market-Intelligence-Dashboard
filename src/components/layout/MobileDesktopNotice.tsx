"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pm-intelligence-mobile-notice-dismissed";

export function MobileDesktopNotice() {
  const [dismissed, setDismissed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "1");
  }, []);

  if (!isMobile || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 lg:hidden">
      <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="metric-label">Desktop Recommended</p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              This product keeps the full map rail, history annotations, and research controls on mobile, but the
              layout reads better on desktop.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss desktop recommendation"
            className="shrink-0 rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEY, "1");
              setDismissed(true);
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
