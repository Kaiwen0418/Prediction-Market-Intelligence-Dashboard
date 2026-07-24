from dataclasses import dataclass
from statistics import median
from typing import Sequence

from app.schemas.polymarket import TradePrint


HISTORICAL_MULTIPLE_THRESHOLD = 3.0
DEPTH_SHARE_THRESHOLD = 0.05
MINIMUM_SAMPLE_SIZE = 5


@dataclass(frozen=True)
class LargeTradeDetection:
    trade_id: str
    side: str
    price: float
    size: float
    timestamp: str
    notional_usd: float
    historical_size_multiple: float
    executable_depth_share: float


@dataclass(frozen=True)
class WhaleActivityAnalysis:
    status: str
    sample_size: int
    median_trade_size: float
    detections: tuple[LargeTradeDetection, ...]


def analyze_whale_activity(
    trades: Sequence[TradePrint],
    total_bid_depth: float,
    total_ask_depth: float,
) -> WhaleActivityAnalysis:
    sample_size = len(trades)
    median_trade_size = float(median(trade.size for trade in trades)) if trades else 0.0

    if (
        sample_size < MINIMUM_SAMPLE_SIZE
        or median_trade_size <= 0
        or total_bid_depth <= 0
        or total_ask_depth <= 0
    ):
        return WhaleActivityAnalysis(
            status="insufficient-data",
            sample_size=sample_size,
            median_trade_size=round(median_trade_size, 4),
            detections=(),
        )

    detections: list[LargeTradeDetection] = []
    for trade in trades:
        executable_depth = total_ask_depth if trade.side == "buy" else total_bid_depth
        historical_multiple = trade.size / median_trade_size
        depth_share = trade.size / executable_depth

        if (
            historical_multiple < HISTORICAL_MULTIPLE_THRESHOLD
            or depth_share < DEPTH_SHARE_THRESHOLD
        ):
            continue

        detections.append(
            LargeTradeDetection(
                trade_id=trade.id,
                side=trade.side,
                price=trade.price,
                size=trade.size,
                timestamp=trade.timestamp,
                notional_usd=round(trade.price * trade.size, 2),
                historical_size_multiple=round(historical_multiple, 2),
                executable_depth_share=round(depth_share, 4),
            )
        )

    detections.sort(
        key=lambda detection: (
            detection.historical_size_multiple,
            detection.executable_depth_share,
        ),
        reverse=True,
    )
    return WhaleActivityAnalysis(
        status="detected" if detections else "clear",
        sample_size=sample_size,
        median_trade_size=round(median_trade_size, 4),
        detections=tuple(detections),
    )
