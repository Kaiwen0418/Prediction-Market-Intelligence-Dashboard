import type { LiveDegradation, LiveReadiness, LiveRegistryHealth, LiveReplay } from "@/types/market";
import type { DataSourceState, SourceDiagnostics } from "@/types/service";

export function buildBackendHealthLine(
  liveReadiness?: LiveReadiness | null,
  liveDegradation?: LiveDegradation | null,
  liveRegistryHealth?: LiveRegistryHealth | null,
) {
  if (!liveReadiness) {
    return "Backend health pending";
  }

  return [
    `Backend ${liveReadiness.state}`,
    `${liveRegistryHealth?.connectedStreams ?? 0}/${liveRegistryHealth?.registrySize ?? 0} connected`,
    liveDegradation ? `${liveDegradation.issueCount} issue${liveDegradation.issueCount === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function buildBackendHealthDetail(
  liveReadiness?: LiveReadiness | null,
  liveDegradation?: LiveDegradation | null,
) {
  return (
    liveDegradation?.issues[0]?.summary ??
    liveReadiness?.checks.find((check) => check.state !== "ready")?.detail ??
    liveReadiness?.checks[0]?.detail ??
    "Readiness checks have not completed yet."
  );
}

export function getReplaySourceLabel(liveReplay?: LiveReplay | null) {
  if (!liveReplay) {
    return "pending";
  }

  return `${liveReplay.sampleCount} samples · ${liveReplay.source ?? "stream"}`;
}

export function getSourceDotColorClass(state?: DataSourceState) {
  switch (state) {
    case "live":
      return "bg-emerald-500";
    case "fallback":
      return "bg-amber-400";
    case "failed":
      return "bg-rose-500";
    default:
      return "bg-slate-300";
  }
}

export function buildSourceDotTitle(label: string, diagnostics?: SourceDiagnostics) {
  const detail = diagnostics?.issues[0]?.message ?? "Not checked yet";
  const checked = diagnostics?.checkedAt ?? "not checked";
  return `${label}: ${diagnostics?.state ?? "pending"} · ${diagnostics?.mode ?? "mock"} · ${checked} · ${detail}`;
}
