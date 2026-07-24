import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOrderbook } from "@/services/polymarket/normalizers";

test("public Data API trades retain only valid proxy-wallet addresses", () => {
  const orderbook = normalizeOrderbook({
    trades: [
      {
        proxyWallet: "0xaebe4cfd8735f44be2768380f1d9b0cfd6882c1d",
        side: "BUY",
        size: 23.98,
        price: 0.0436663887,
        timestamp: 1784892844,
        transactionHash: "0xtrade"
      },
      {
        proxyWallet: "not-an-address",
        side: "SELL",
        size: 5,
        price: 0.6,
        timestamp: 1784892844,
        transactionHash: "0xinvalid-wallet"
      }
    ]
  });

  assert.equal(
    orderbook?.trades[0]?.walletAddress,
    "0xaebe4cfd8735f44be2768380f1d9b0cfd6882c1d"
  );
  assert.equal(orderbook?.trades[1]?.walletAddress, undefined);
});
