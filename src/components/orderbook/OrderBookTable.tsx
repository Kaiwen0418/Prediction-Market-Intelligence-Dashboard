import type { OrderbookState } from "@/types/market";

type OrderBookTableProps = {
  orderbook: OrderbookState;
};

export function OrderBookTable({ orderbook }: OrderBookTableProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <p className="metric-label mb-3">Bids</p>
        <div className="overflow-hidden rounded-2xl border border-emerald-200">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50 text-emerald-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Size</th>
              </tr>
            </thead>
            <tbody>
              {orderbook.bids.slice(0, 8).map((level) => (
                <tr key={`bid-${level.price}`} className="border-t border-emerald-100">
                  <td className="px-4 py-2.5">{level.price.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right">{level.size.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <p className="metric-label mb-3">Asks</p>
        <div className="overflow-hidden rounded-2xl border border-orange-200">
          <table className="w-full text-sm">
            <thead className="bg-orange-50 text-orange-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Size</th>
              </tr>
            </thead>
            <tbody>
              {orderbook.asks.slice(0, 8).map((level) => (
                <tr key={`ask-${level.price}`} className="border-t border-orange-100">
                  <td className="px-4 py-2.5">{level.price.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right">{level.size.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
