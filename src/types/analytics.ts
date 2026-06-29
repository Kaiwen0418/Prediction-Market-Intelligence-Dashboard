export type LeadLagResult = {
  lagDays: number;
  score: number;
  interpretation: string;
};

export type MomentumResult = {
  oneDay: number;
  sevenDay: number;
  direction: "up" | "down" | "flat";
};

export type CorrelationResult = {
  coefficient: number;
  strength: "weak" | "moderate" | "strong";
};

export type DivergenceResult = {
  averageGap: number;
  maxGap: number;
  currentGap: number;
};

export type RollingCorrelationResult = {
  coefficient: number;
  windowSize: number;
  points: Array<{
    timestamp: string;
    coefficient: number;
  }>;
};

export type EventWindowResult = {
  anchorIndex: number;
  anchorTimestamp: string;
  preChange: number;
  postChange: number;
  netMove: number;
  preWindow: number;
  postWindow: number;
};

export type LiquidityMetrics = {
  totalBidDepth: number;
  totalAskDepth: number;
  imbalance: number;
  spreadBps: number;
};

export type VolatilityResult = {
  realizedVolatility: number;
  averageReturn: number;
};

export type AnalyticsSummaryResult = {
  leadLag: LeadLagResult;
  correlation: CorrelationResult;
  volatility: VolatilityResult;
  divergence: DivergenceResult;
  rollingCorrelation: RollingCorrelationResult;
  eventWindow: EventWindowResult;
};

export type TradePressureResult = {
  buyVolume: number;
  sellVolume: number;
  ratio: number;
  pressure: "buy" | "sell" | "balanced";
};

export type EventImpactResult = {
  averageImpact: number;
  strongestEventId: string | null;
  strongestMove: number;
};
