export type ValidationStage = "config" | "reachability" | "payload" | "normalization";

export type DataSourceState = "pending" | "live" | "fallback" | "failed";

export type ValidationIssue = {
  stage: ValidationStage;
  message: string;
};

export type SourceMode = "live" | "curated" | "mock";

export type SourceDiagnostics = {
  sourceKey: string;
  state: DataSourceState;
  mode: SourceMode;
  checkedAt: string | null;
  issues: ValidationIssue[];
};
