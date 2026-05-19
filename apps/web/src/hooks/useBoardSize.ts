"use client";

import { useState, useEffect, type RefObject } from "react";

export function useBoardSize(
  containerRef: RefObject<HTMLDivElement | null>,
): { cellSize: number } {
  const [cellSize, setCellSize] = useState(48);

  useEffect(() => {
    function calc(): number {
      const vw = window.innerWidth;
      const containerH = containerRef.current?.clientHeight;
      const vh =
        containerH ?? window.visualViewport?.height ?? window.innerHeight;
      const fromH = Math.floor((vh - 220) / 10.1);
      const fromW = Math.floor((vw - 16) / 9);
      return Math.max(32, Math.min(fromW, fromH));
    }

    setCellSize(calc());
    const handler = () => setCellSize(calc());
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

  return { cellSize };
}
