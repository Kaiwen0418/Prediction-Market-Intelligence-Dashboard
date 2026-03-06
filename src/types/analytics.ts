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
