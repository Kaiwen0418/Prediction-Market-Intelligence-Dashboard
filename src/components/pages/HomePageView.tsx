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
      footerLeft="MarketFlow reimagines prediction markets as intelligence networks, fusing real-time pricing, liquidity analytics, and event catalysts into a cohesive interface that decodes market psychology and collective foresight."
      footerRight="Evolving from guided demos to autonomous monitoring, MarketFlow charts a course toward democratizing predictive intelligence—envisioning AI-enhanced forecasting, global market integration, and community-driven decision tools that empower societies to anticipate and shape the future."
      showHero
    >
      <div className="product-demo-market">
        <MarketPageView embedded />
      </div>
    </ProductDemoShell>
  );
}
