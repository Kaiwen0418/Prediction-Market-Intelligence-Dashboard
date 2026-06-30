import math

import numpy as np

from app.schemas.live import LiveMicrostructureMetricsResponse
from app.schemas.polymarket import LiquiditySummary, TradePressureSummary


def calculate_liquidity_summary(
    bids: list[tuple[float, float]],
    asks: list[tuple[float, float]],
    spread: float,
    mid_price: float,
) -> LiquiditySummary:
    bid_sizes = np.array([size for _, size in bids], dtype=float) if bids else np.array([], dtype=float)
    ask_sizes = np.array([size for _, size in asks], dtype=float) if asks else np.array([], dtype=float)

    total_bid_depth = float(bid_sizes.sum()) if bid_sizes.size else 0.0
    total_ask_depth = float(ask_sizes.sum()) if ask_sizes.size else 0.0
    imbalance_base = total_bid_depth + total_ask_depth
    imbalance = (total_bid_depth - total_ask_depth) / imbalance_base if imbalance_base else 0.0
    spread_bps = (spread / mid_price) * 10_000 if mid_price else 0.0

    return LiquiditySummary(
        totalBidDepth=round(total_bid_depth, 4),
        totalAskDepth=round(total_ask_depth, 4),
        imbalance=round(imbalance, 3),
        spreadBps=round(spread_bps, 1),
    )


def calculate_trade_pressure_summary(trades: list[tuple[str, float]]) -> TradePressureSummary:
    if not trades:
        return TradePressureSummary(
            buyVolume=0.0,
            sellVolume=0.0,
            ratio=0.0,
            pressure="balanced",
        )

    buy_volume = float(sum(size for side, size in trades if side == "buy"))
    sell_volume = float(sum(size for side, size in trades if side == "sell"))
    ratio = buy_volume if sell_volume == 0 else buy_volume / sell_volume
    pressure = "buy" if ratio > 1.15 else "sell" if ratio < 0.87 else "balanced"

    return TradePressureSummary(
        buyVolume=round(buy_volume, 4),
        sellVolume=round(sell_volume, 4),
        ratio=round(ratio, 2) if math.isfinite(ratio) else 0.0,
        pressure=pressure,
    )


def calculate_live_microstructure_metrics(
    bids: list[tuple[float, float]],
    asks: list[tuple[float, float]],
    trades: list[tuple[str, float]],
    mid_prices: list[float],
) -> LiveMicrostructureMetricsResponse:
    best_bid = bids[0][0] if bids else 0.0
    best_ask = asks[0][0] if asks else 0.0
    bid_depth = float(np.sum(np.array([size for _, size in bids[:5]], dtype=float))) if bids else 0.0
    ask_depth = float(np.sum(np.array([size for _, size in asks[:5]], dtype=float))) if asks else 0.0
    depth_base = bid_depth + ask_depth
    depth_skew = (bid_depth - ask_depth) / depth_base if depth_base else 0.0

    if best_bid > 0 and best_ask > 0 and depth_base:
        microprice = ((best_ask * bid_depth) + (best_bid * ask_depth)) / depth_base
    else:
        microprice = best_bid or best_ask

    trade_sizes = np.array([size for _, size in trades], dtype=float) if trades else np.array([], dtype=float)
    trade_signs = (
        np.array([1.0 if side == "buy" else -1.0 for side, _ in trades], dtype=float)
        if trades
        else np.array([], dtype=float)
    )
    signed_flow = trade_signs * trade_sizes if trade_sizes.size and trade_signs.size else np.array([], dtype=float)
    total_flow = float(np.sum(np.abs(signed_flow))) if signed_flow.size else 0.0
    order_flow_imbalance = float(np.sum(signed_flow) / total_flow) if total_flow else 0.0
    trade_intensity = float(np.mean(trade_sizes)) if trade_sizes.size else 0.0

    mid_array = np.array(mid_prices, dtype=float) if mid_prices else np.array([], dtype=float)
    valid_mid_array = mid_array[mid_array > 0]
    if valid_mid_array.size >= 2:
        log_returns = np.diff(np.log(valid_mid_array))
        realized_volatility = float(np.sqrt(np.sum(np.square(log_returns))))
    else:
        realized_volatility = 0.0

    return LiveMicrostructureMetricsResponse(
        microprice=round(microprice, 4),
        depthSkew=round(depth_skew, 3),
        realizedVolatility=round(realized_volatility, 6),
        tradeIntensity=round(trade_intensity, 4),
        orderFlowImbalance=round(order_flow_imbalance, 3),
    )
