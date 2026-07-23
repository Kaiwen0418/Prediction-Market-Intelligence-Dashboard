"use client";

import { ProductDemoShell } from "@/components/layout/ProductDemoShell";
import { MarketPageView } from "@/components/pages/MarketPageView";

export function HomePageView() {
  return (
    <ProductDemoShell
      barLeft="Prediction Market Intelligence"
      barCenter="-"
      barRight="v0.03"
      title={
        <>
          Market
          <br />
          Flow
        </>
      }
      footerLabel="Vision & Thesis"
      footerLeft="MarketFlow turns Polymarket contracts into an observable market system: state-level navigation, live order-book depth, backend-streamed microstructure, and annotated probability history in one research surface."
      footerRight="The longer-term thesis is an open predictive-intelligence layer that measures information arrival, liquidity regimes, and event impact across markets—then exposes those signals through reproducible FastAPI and NumPy analytics."
      showHero
    >
      <div className="product-demo-market">
        <MarketPageView embedded strictLive={false} />
      </div>
    </ProductDemoShell>
  );
}
