import type { LiquidityMetrics } from "@/types/analytics";
import type { OrderbookState } from "@/types/market";

export function calculateLiquidity(orderbook: OrderbookState): LiquidityMetrics {
  const totalBidDepth = orderbook.bids.reduce((sum, level) => sum + level.size, 0);
  const totalAskDepth = orderbook.asks.reduce((sum, level) => sum + level.size, 0);
  const imbalanceBase = totalBidDepth + totalAskDepth;
  const imbalance = imbalanceBase === 0 ? 0 : (totalBidDepth - totalAskDepth) / imbalanceBase;
  const spreadBps = orderbook.midPrice === 0 ? 0 : (orderbook.spread / orderbook.midPrice) * 10_000;

  return {
    totalBidDepth,
    totalAskDepth,
    imbalance: Number(imbalance.toFixed(3)),
    spreadBps: Number(spreadBps.toFixed(1))
  };
}
