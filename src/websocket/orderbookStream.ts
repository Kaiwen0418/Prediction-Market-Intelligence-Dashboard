import { createOrderbookSnapshot } from "@/services/polymarket/mockData";
import { MockWebSocketClient } from "./wsClient";

export const orderbookStream = new MockWebSocketClient({
  intervalMs: 2_000,
  createMessage: () => createOrderbookSnapshot()
});
