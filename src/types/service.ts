export type ValidationStage = "config" | "reachability" | "payload" | "normalization";

export type DataSourceState = "pending" | "live" | "fallback" | "failed";

export type ValidationIssue = {
  stage: ValidationStage;
  message: string;
};

export type SourceDiagnostics = {
  sourceKey: string;
  state: DataSourceState;
  mode: "live" | "mock";
  checkedAt: string | null;
  issues: ValidationIssue[];
};
