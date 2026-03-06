import { createOrderbookSnapshot } from "@/services/polymarket/mockData";
import { PolymarketWebSocket } from "@/services/polymarket/ws";
import { useDataSourceStore } from "@/stores/dataSourceStore";

type StreamHandler = (payload: unknown) => void;

class OrderbookStream {
  private readonly liveSocket = new PolymarketWebSocket();
  private timer: ReturnType<typeof setInterval> | null = null;
  private liveFailed = false;

  private startMockStream(handler: StreamHandler) {
    if (this.timer) return;
    useDataSourceStore.getState().markFallback("orderbook-stream", {
      stage: "reachability",
      message: "WebSocket live stream unavailable; falling back to mock realtime updates"
    });

    this.timer = setInterval(() => {
      const snapshot = createOrderbookSnapshot();
      handler({
        event_type: "book",
        asset_id: snapshot.tokenId ?? snapshot.marketId,
        market: snapshot.marketId,
        bids: snapshot.bids.map((level) => ({
          price: String(level.price),
          size: String(level.size)
        })),
        asks: snapshot.asks.map((level) => ({
          price: String(level.price),
          size: String(level.size)
        })),
        timestamp: snapshot.updatedAt
      });
    }, 2_000);
  }

  connect(tokenId: string | undefined, handler: StreamHandler) {
    if (tokenId && !this.liveFailed) {
      this.liveSocket.connect([tokenId], {
        onOpen: () => {
          useDataSourceStore.getState().markLive("orderbook-stream");
        },
        onMessage: handler,
        onError: () => {
          this.liveFailed = true;
          this.liveSocket.disconnect();
          this.startMockStream(handler);
        },
        onClose: (event) => {
          if (event && !event.wasClean) {
            this.liveFailed = true;
            this.startMockStream(handler);
          }
        }
      });
      return;
    }

    this.startMockStream(handler);
  }

  disconnect() {
    this.liveSocket.disconnect();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const orderbookStream = new OrderbookStream();
