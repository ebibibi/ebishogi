"use client";

import { useState, useEffect, type RefObject } from "react";

export type BoardLayout = {
  cellSize: number;
  compact: boolean;
};

export function useBoardSize(
  containerRef: RefObject<HTMLDivElement | null>,
): BoardLayout {
  const [layout, setLayout] = useState<BoardLayout>({
    cellSize: 48,
    compact: false,
  });

  useEffect(() => {
    function calc(): BoardLayout {
      const vw = window.innerWidth;
      const compact = vw < 640;

      if (compact) {
        const containerH = containerRef.current?.clientHeight;
        const vh = containerH ?? window.visualViewport?.height ?? window.innerHeight;
        const fromW = Math.floor((vw - 16) / 9);
        const fromH = Math.floor((vh - 260) / 9);
        return {
          cellSize: Math.max(32, Math.min(fromW, fromH)),
          compact: true,
        };
      }

      const vh = window.visualViewport?.height ?? window.innerHeight;
      const fromH = Math.floor((vh - 260) / 9);
      const fromW = Math.floor((vw - 260) / 9);
      return { cellSize: Math.max(48, Math.min(fromH, fromW)), compact: false };
    }

    setLayout(calc());

    const handler = () => setLayout(calc());
    const el = containerRef.current;
    const observer = el ? new ResizeObserver(handler) : null;
    if (el) observer!.observe(el);

    const vp = window.visualViewport;
    if (vp) vp.addEventListener("resize", handler);
    window.addEventListener("resize", handler);
    return () => {
      observer?.disconnect();
      if (vp) vp.removeEventListener("resize", handler);
      window.removeEventListener("resize", handler);
    };
  }, [containerRef]);

  return layout;
}
