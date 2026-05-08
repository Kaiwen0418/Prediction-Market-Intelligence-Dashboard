"use client";

import { useEffect, useState } from "react";

export function MobileDesktopNotice() {
  const [dismissed, setDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!isMobile || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-recommended-title"
    >
      <button
        type="button"
        aria-label="Dismiss desktop recommendation"
        className="absolute inset-0 h-full w-full bg-slate-900/50 backdrop-blur-sm"
        onClick={handleDismiss}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p
            id="desktop-recommended-title"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
          >
            Best on Desktop
          </p>
          <button
            type="button"
            aria-label="Dismiss desktop recommendation"
            className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            onClick={handleDismiss}
          >
            Dismiss
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          MarketFlow&rsquo;s map, depth chart, and annotated price history are designed for a wider viewport. Open on a
          laptop for the full experience.
        </p>
      </div>
    </div>
  );
}
