"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketTradePrint } from "@/types/market";
import { formatTimestamp } from "@/utils/time";

type MapLiveTradeTapeProps = {
  trades: MarketTradePrint[];
};

const VISIBLE_TRADE_COUNT = 3;

function formatNotional(trade: MarketTradePrint) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(trade.price * trade.size);
}

export function getVisibleMarketTrades(
  trades: MarketTradePrint[],
  offset: number,
  count = VISIBLE_TRADE_COUNT
) {
  if (!trades.length) return [];

  return Array.from(
    { length: Math.min(count, trades.length) },
    (_, index) => trades[(offset + index) % trades.length]
  );
}

export function MapLiveTradeTape({ trades }: MapLiveTradeTapeProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset((current) => (trades.length ? current % trades.length : 0));
  }, [trades.length]);

  useEffect(() => {
    if (trades.length <= VISIBLE_TRADE_COUNT) return;

    const interval = window.setInterval(() => {
      setOffset((current) => (current + 1) % trades.length);
    }, 2_800);

    return () => window.clearInterval(interval);
  }, [trades.length]);

  const visibleTrades = useMemo(
    () => getVisibleMarketTrades(trades, offset),
    [offset, trades]
  );

  if (!visibleTrades.length) return null;

  return (
    <section
      aria-label="Live trades across all markets"
      aria-live="polite"
      className="absolute bottom-3 left-3 z-10 w-[calc(100%_-_1.5rem)] max-w-[calc(100vw_-_3.5rem)] overflow-hidden border border-slate-200 bg-white/95 font-sans shadow-lg backdrop-blur-sm sm:max-w-[390px]"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex h-8 items-center justify-between border-b border-slate-200 px-3">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase text-slate-900">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live trades
        </span>
        <span className="text-[9px] font-medium uppercase text-slate-500">
          All markets
        </span>
      </div>
      <div key={offset} className="map-trade-tape-enter">
        {visibleTrades.map((trade, index) => (
          <a
            key={trade.id}
            href={`https://polymarket.com/event/${
              trade.eventSlug || trade.marketSlug
            }`}
            target="_blank"
            rel="noreferrer"
            className={`h-11 grid-cols-[42px_minmax(0,1fr)_64px] items-center gap-2 border-b border-slate-100 px-3 last:border-b-0 hover:bg-slate-50 ${
              index === 2 ? "hidden sm:grid" : "grid"
            }`}
          >
            <span
              className={`text-[10px] font-semibold uppercase ${
                trade.side === "buy"
                  ? "text-emerald-700"
                  : "text-rose-700"
              }`}
            >
              {trade.side}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium text-slate-900">
                {trade.title}
              </span>
              <span className="block truncate text-[9px] text-slate-500">
                {trade.outcome ? `${trade.outcome} · ` : ""}
                {formatTimestamp(trade.timestamp, "HH:mm:ss")}
              </span>
            </span>
            <span className="text-right">
              <span className="block text-[11px] font-semibold tabular-nums text-slate-900">
                {(trade.price * 100).toFixed(0)}¢
              </span>
              <span className="block text-[9px] tabular-nums text-slate-500">
                {formatNotional(trade)}
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
