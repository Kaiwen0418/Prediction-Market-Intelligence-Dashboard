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
