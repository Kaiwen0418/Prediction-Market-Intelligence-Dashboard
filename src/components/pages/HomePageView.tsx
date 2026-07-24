"use client";

import { ProductDemoShell } from "@/components/layout/ProductDemoShell";
import { MarketPageView } from "@/components/pages/MarketPageView";

export function HomePageView() {
  return (
    <ProductDemoShell
      brand="Prediction Market Intelligence"
      context="Political markets · Map intelligence"
      title="Market Flow"
      showHero={false}
    >
      <div className="product-demo-market">
        <MarketPageView embedded strictLive={false} />
      </div>
    </ProductDemoShell>
  );
}
