import type { TradePrint } from "@/types/market";
import { formatTimestamp } from "@/utils/time";

type TradeTapeProps = {
  trades: TradePrint[];
};

export function TradeTape({ trades }: TradeTapeProps) {
  return (
    <div className="rounded-2xl border border-slate-200">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">
        <span>Time</span>
        <span>Price</span>
        <span>Size</span>
      </div>
      <div className="max-h-[320px] overflow-auto">
        {trades.slice(0, 20).map((trade) => (
          <div
            key={trade.id}
            className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
          >
            <span className="text-slate-600">{formatTimestamp(trade.timestamp, "MMM d, HH:mm")}</span>
            <span className={trade.side === "buy" ? "text-emerald-600" : "text-orange-600"}>
              {trade.price.toFixed(2)}
            </span>
            <span className="text-right text-slate-900">{trade.size.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
