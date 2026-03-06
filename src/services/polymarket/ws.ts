import type { MarketChannelSubscription } from "@/types/ws";
import { polymarketConfig } from "./config";

type SocketHandlers = {
  onOpen?: () => void;
  onMessage: (payload: unknown) => void;
  onError?: (error: Event | EventTarget | null) => void;
  onClose?: (event?: CloseEvent) => void;
};

export class PolymarketWebSocket {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private manualClose = false;
  private activeTokenKey = "";
  private isConnecting = false;

  connect(tokenIds: string[], handlers: SocketHandlers) {
    const tokenKey = tokenIds.join(",");
    if (!tokenIds.length || this.socket || this.isConnecting) return;
    if (this.activeTokenKey === tokenKey && this.reconnectTimer) return;

    this.manualClose = false;
    this.isConnecting = true;
    this.activeTokenKey = tokenKey;
    const socket = new WebSocket(polymarketConfig.wsUrl);
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.isConnecting = false;
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
      this.isConnecting = false;
      handlers.onError?.(error.currentTarget ?? error.target ?? null);
    });

    socket.addEventListener("close", (event) => {
      this.isConnecting = false;
      this.socket = null;
      handlers.onClose?.(event);

      if (!this.manualClose) {
        const delay = Math.min(1_000 * 2 ** this.reconnectAttempts, 15_000);
        this.reconnectAttempts += 1;
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect(tokenIds, handlers);
        }, delay);
      }
    });
  }

  disconnect() {
    this.manualClose = true;
    this.isConnecting = false;
    this.activeTokenKey = "";
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }
}
