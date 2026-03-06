import type { MarketChannelSubscription } from "@/types/ws";
import { polymarketConfig } from "./config";

type SocketHandlers = {
  onOpen?: () => void;
  onMessage: (payload: unknown) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
};

export class PolymarketWebSocket {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private manualClose = false;

  connect(tokenIds: string[], handlers: SocketHandlers) {
    if (!tokenIds.length || this.socket) return;

    this.manualClose = false;
    const socket = new WebSocket(polymarketConfig.wsUrl);
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      const subscription: MarketChannelSubscription = {
        type: "market",
        assets_ids: tokenIds,
        initial_dump: true
      };
      socket.send(JSON.stringify(subscription));
      handlers.onOpen?.();
    });

    socket.addEventListener("message", (event) => {
      try {
        handlers.onMessage(JSON.parse(event.data as string));
      } catch {
        handlers.onMessage(event.data);
      }
    });

    socket.addEventListener("error", (error) => {
      handlers.onError?.(error);
    });

    socket.addEventListener("close", () => {
      this.socket = null;
      handlers.onClose?.();

      if (!this.manualClose) {
        const delay = Math.min(1_000 * 2 ** this.reconnectAttempts, 15_000);
        this.reconnectAttempts += 1;
        this.reconnectTimer = setTimeout(() => this.connect(tokenIds, handlers), delay);
      }
    });
  }

  disconnect() {
    this.manualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }
}
