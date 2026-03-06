"use client";

import { useDataSourceStore } from "@/stores/dataSourceStore";

export function useSourceDiagnostics() {
  return useDataSourceStore((state) => state.sources);
}
