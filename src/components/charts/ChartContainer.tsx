"use client";

import dynamic from "next/dynamic";

export const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false
});
