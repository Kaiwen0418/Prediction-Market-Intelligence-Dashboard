"use client";

import { useEffect, useRef } from "react";

type UseRealtimeConnectionOptions<T> = {
  enabled: boolean;
  connect: (onBatch: (events: T[]) => void) => () => void;
  onBatch: (events: T[]) => void;
};

export function useRealtimeConnection<T>({ enabled, connect, onBatch }: UseRealtimeConnectionOptions<T>) {
  const queueRef = useRef<T[]>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const flush = () => {
      frameRef.current = null;
      if (!queueRef.current.length) return;
      const batch = queueRef.current;
      queueRef.current = [];
      onBatch(batch);
    };

    const disconnect = connect((events) => {
      queueRef.current.push(...events);
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(flush);
      }
    });

    return () => {
      disconnect();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      queueRef.current = [];
      frameRef.current = null;
    };
  }, [connect, enabled, onBatch]);
}
