import { createOrderbookSnapshot } from "@/services/polymarket/mockData";
import { PolymarketWebSocket } from "@/services/polymarket/ws";
import { useDataSourceStore } from "@/stores/dataSourceStore";

type StreamHandler = (payload: unknown) => void;
type ConnectOptions = {
  allowMockFallback?: boolean;
};

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

  connect(tokenId: string | undefined, handler: StreamHandler, options: ConnectOptions = {}) {
    const { allowMockFallback = true } = options;
    if (tokenId && !this.liveFailed) {
      this.liveSocket.connect([tokenId], {
        onOpen: () => {
          useDataSourceStore.getState().markLive("orderbook-stream");
        },
        onMessage: handler,
        onError: () => {
          this.liveFailed = true;
          this.liveSocket.disconnect();
          if (allowMockFallback) {
            this.startMockStream(handler);
          } else {
            useDataSourceStore.getState().markFailed("orderbook-stream", {
              stage: "reachability",
              message: "WebSocket live stream unavailable and mock fallback is disabled"
            });
          }
        },
        onClose: (event) => {
          if (event && !event.wasClean) {
            this.liveFailed = true;
            if (allowMockFallback) {
              this.startMockStream(handler);
            } else {
              useDataSourceStore.getState().markFailed("orderbook-stream", {
                stage: "reachability",
                message: "WebSocket live stream closed unexpectedly and mock fallback is disabled"
              });
            }
          }
        }
      });
      return;
    }

    if (allowMockFallback) {
      this.startMockStream(handler);
      return;
    }

    useDataSourceStore.getState().markFailed("orderbook-stream", {
      stage: "config",
      message: "No live token was available for the orderbook stream and mock fallback is disabled"
    });
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
