import { createOrderbookSnapshot } from "@/services/polymarket/mockData";
import { PolymarketWebSocket } from "@/services/polymarket/ws";

type StreamHandler = (payload: unknown) => void;

class OrderbookStream {
  private readonly liveSocket = new PolymarketWebSocket();
  private timer: ReturnType<typeof setInterval> | null = null;

  connect(tokenId: string | undefined, handler: StreamHandler) {
    if (tokenId) {
      this.liveSocket.connect([tokenId], {
        onMessage: handler
      });
      return;
    }

    if (this.timer) return;
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

  disconnect() {
    this.liveSocket.disconnect();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const orderbookStream = new OrderbookStream();
