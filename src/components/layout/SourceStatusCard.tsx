"use client";

import type { SourceDiagnostics } from "@/types/service";
import { relativeTime } from "@/utils/time";

type SourceStatusCardProps = {
  title: string;
  diagnostics?: SourceDiagnostics;
};

export function SourceStatusCard({ title, diagnostics }: SourceStatusCardProps) {
  const state = diagnostics?.state ?? "pending";
  const mode = diagnostics?.mode ?? "mock";
  const tone =
    state === "live"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : state === "fallback"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : state === "failed"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      <p className="metric-label">{title}</p>
      <p className="mt-1 font-medium capitalize">
        {state} · {mode}
      </p>
      <p className="mt-1 text-xs opacity-80">
        {diagnostics?.checkedAt ? `Checked ${relativeTime(diagnostics.checkedAt)}` : "Not checked yet"}
      </p>
      {diagnostics?.issues[0] ? <p className="mt-2 text-xs leading-5">{diagnostics.issues[0].message}</p> : null}
    </div>
  );
}
