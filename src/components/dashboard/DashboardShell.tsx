"use client";

import { calculateLeadLag } from "@/analytics/leadLag";
import { calculateLiquidity } from "@/analytics/liquidity";
import { calculateMomentum } from "@/analytics/momentum";
import { calculateVolatility } from "@/analytics/volatility";
import { DepthChart } from "@/components/charts/DepthChart";
import { MarketPollChart } from "@/components/charts/MarketPollChart";
import { Header } from "@/components/layout/Header";
import { MetricCard } from "@/components/layout/MetricCard";
import { OrderBookTable } from "@/components/orderbook/OrderBookTable";
import { TradeTape } from "@/components/orderbook/TradeTape";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { useMarketData } from "@/hooks/useMarketData";
import { useOrderbook } from "@/hooks/useOrderbook";
import { usePollingData } from "@/hooks/usePollingData";
import { useTimelineData } from "@/hooks/useTimelineData";
import { useEventStore } from "@/stores/eventStore";
import { useMarketStore } from "@/stores/marketStore";
import { relativeTime } from "@/utils/time";

export function DashboardShell() {
  const { featuredMarketQuery, historicalSeriesQuery } = useMarketData();
  const pollingQuery = usePollingData();
  const timelineQuery = useTimelineData();
  const { orderbook } = useOrderbook();

  const featuredMarket = useMarketStore((state) => state.featuredMarket);
  const marketSeries = useMarketStore((state) => state.series);
  const events = useEventStore((state) => state.events);

  const isLoading =
    featuredMarketQuery.isLoading ||
    historicalSeriesQuery.isLoading ||
    pollingQuery.isLoading ||
    timelineQuery.isLoading ||
    !orderbook;

  if (isLoading || !featuredMarket || !pollingQuery.data || !orderbook) {
    return (
      <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-12">
        <div className="panel px-8 py-8 text-center">
          <p className="metric-label">Initializing dashboard</p>
          <p className="mt-3 text-lg text-slate-700">Hydrating market, polling, timeline, and orderbook streams...</p>
        </div>
      </main>
    );
  }

  const leadLag = calculateLeadLag(marketSeries, pollingQuery.data);
  const volatility = calculateVolatility(marketSeries);
  const momentum = calculateMomentum(marketSeries);
  const liquidity = calculateLiquidity(orderbook);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
      <Header />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Market Probability"
          value={`${(featuredMarket.probability * 100).toFixed(1)}%`}
          detail={`${featuredMarket.title} updated ${relativeTime(featuredMarket.updatedAt)}`}
        />
        <MetricCard
          label="Lead-Lag Signal"
          value={leadLag.lagDays === 0 ? "Sync" : `${Math.abs(leadLag.lagDays)}d`}
          detail={`${leadLag.interpretation} (corr ${leadLag.score})`}
        />
        <MetricCard
          label="Realized Volatility"
          value={`${volatility.realizedVolatility}%`}
          detail={`Average daily move ${volatility.averageReturn > 0 ? "+" : ""}${volatility.averageReturn} pts`}
        />
        <MetricCard
          label="Liquidity Imbalance"
          value={`${(liquidity.imbalance * 100).toFixed(1)}%`}
          detail={`Spread ${liquidity.spreadBps} bps, mid ${orderbook.midPrice.toFixed(3)}`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="panel px-6 py-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="metric-label">Historical Market vs Polls</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Market pricing against polling consensus</h2>
            </div>
            <p className="text-sm text-slate-500">
              1D momentum {momentum.oneDay > 0 ? "+" : ""}{momentum.oneDay} pts | 7D {momentum.sevenDay > 0 ? "+" : ""}{momentum.sevenDay} pts
            </p>
          </div>
          <div className="mt-6">
            <MarketPollChart marketSeries={marketSeries} pollSeries={pollingQuery.data} />
          </div>
        </div>

        <div className="panel px-6 py-6">
          <p className="metric-label">Realtime Orderbook</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Depth, spread, and live market microstructure</h2>
          <div className="mt-6">
            <DepthChart orderbook={orderbook} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="metric-label">Best Bid</p>
              <p className="mt-1 font-semibold text-slate-900">{orderbook.bids[0]?.price.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="metric-label">Best Ask</p>
              <p className="mt-1 font-semibold text-slate-900">{orderbook.asks[0]?.price.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="metric-label">24h Volume</p>
              <p className="mt-1 font-semibold text-slate-900">${featuredMarket.volume24h.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel px-6 py-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="metric-label">Orderbook L2</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Bid and ask ladder</h2>
            </div>
            <p className="text-sm text-slate-500">Updated {relativeTime(orderbook.updatedAt)}</p>
          </div>
          <div className="mt-6">
            <OrderBookTable orderbook={orderbook} />
          </div>
        </div>

        <div className="panel px-6 py-6">
          <p className="metric-label">Trade Tape</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Recent prints and trade pressure</h2>
          <div className="mt-6">
            <TradeTape trades={orderbook.trades} />
          </div>
        </div>
      </section>

      <section className="panel px-6 py-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="metric-label">Event Timeline</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Catalysts matched against price movement</h2>
          </div>
          <p className="text-sm text-slate-500">{events.length} tracked events in current window</p>
        </div>
        <div className="mt-6">
          <EventTimeline events={events} />
        </div>
      </section>
    </main>
  );
}
