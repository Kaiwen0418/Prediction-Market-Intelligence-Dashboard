"use client";

import { ProductDemoShell } from "@/components/layout/ProductDemoShell";
import { MarketPageView } from "@/components/pages/MarketPageView";

export function HomePageView() {
  return (
    <ProductDemoShell
      barLeft="Prediction Market Intelligence"
      barCenter="Hero + Live Market"
      barRight="Research lives separately"
      title={
        <>
          Market
          <br />
          Flow
        </>
      }
      footerLabel="Interface Thesis"
      footerLeft="This dashboard frames prediction markets as a product surface: price, liquidity, and catalysts are shown together so users can read market structure instead of just a quote."
      footerRight="The experience moves from preset product demo to strict live market monitoring and cached historical comparison, giving a clear path from orientation to real usage."
      showHero
    >
      <div className="product-demo-market">
        <MarketPageView embedded />
      </div>
    </ProductDemoShell>
  );
}
