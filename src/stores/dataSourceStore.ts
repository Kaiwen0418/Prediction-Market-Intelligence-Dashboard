"use client";

import { create } from "zustand";
import type { SourceDiagnostics, ValidationIssue } from "@/types/service";

type DataSourceStoreState = {
  sources: Record<string, SourceDiagnostics>;
  markPending: (sourceKey: string) => void;
  markLive: (sourceKey: string) => void;
  markCurated: (sourceKey: string) => void;
  markFallback: (sourceKey: string, issue: ValidationIssue) => void;
  markFailed: (sourceKey: string, issue: ValidationIssue) => void;
};

function baseDiagnostics(sourceKey: string): SourceDiagnostics {
  return {
    sourceKey,
    state: "pending",
    mode: "mock",
    checkedAt: null,
    issues: []
  };
}

export const useDataSourceStore = create<DataSourceStoreState>((set) => ({
  sources: {},
  markPending: (sourceKey) =>
    set((state) => ({
      sources: {
        ...state.sources,
        [sourceKey]: {
          ...(state.sources[sourceKey] ?? baseDiagnostics(sourceKey)),
          state: "pending",
          checkedAt: new Date().toISOString()
        }
      }
    })),
  markLive: (sourceKey) =>
    set((state) => ({
      sources: {
        ...state.sources,
        [sourceKey]: {
          sourceKey,
          state: "live",
          mode: "live",
          checkedAt: new Date().toISOString(),
          issues: []
        }
      }
    })),
  markCurated: (sourceKey) =>
    set((state) => ({
      sources: {
        ...state.sources,
        [sourceKey]: {
          sourceKey,
          state: "live",
          mode: "curated",
          checkedAt: new Date().toISOString(),
          issues: []
        }
      }
    })),
  markFallback: (sourceKey, issue) =>
    set((state) => ({
      sources: {
        ...state.sources,
        [sourceKey]: {
          ...(state.sources[sourceKey] ?? baseDiagnostics(sourceKey)),
          state: "fallback",
          mode: "mock",
          checkedAt: new Date().toISOString(),
          issues: [...(state.sources[sourceKey]?.issues ?? []), issue].slice(-5)
        }
      }
    })),
  markFailed: (sourceKey, issue) =>
    set((state) => ({
      sources: {
        ...state.sources,
        [sourceKey]: {
          ...(state.sources[sourceKey] ?? baseDiagnostics(sourceKey)),
          state: "failed",
          mode: "mock",
          checkedAt: new Date().toISOString(),
          issues: [...(state.sources[sourceKey]?.issues ?? []), issue].slice(-5)
        }
      }
    }))
}));
