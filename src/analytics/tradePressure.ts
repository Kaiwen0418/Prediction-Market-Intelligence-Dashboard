import type { TradePressureResult } from "@/types/analytics";
import type { TradePrint } from "@/types/market";

export function calculateTradePressure(trades: TradePrint[]): TradePressureResult {
  const buyVolume = trades.filter((trade) => trade.side === "buy").reduce((sum, trade) => sum + trade.size, 0);
  const sellVolume = trades.filter((trade) => trade.side === "sell").reduce((sum, trade) => sum + trade.size, 0);
  const ratio = sellVolume === 0 ? buyVolume : buyVolume / sellVolume;
  const pressure = ratio > 1.15 ? "buy" : ratio < 0.87 ? "sell" : "balanced";

  return {
    buyVolume,
    sellVolume,
    ratio: Number(ratio.toFixed(2)),
    pressure
  };
}
