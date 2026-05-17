"use client";

import { useState, useEffect } from "react";

export type BoardLayout = {
  cellSize: number;
  compact: boolean;
};

export function useBoardSize(): BoardLayout {
  const [layout, setLayout] = useState<BoardLayout>({ cellSize: 48, compact: false });

  useEffect(() => {
    function calc(): BoardLayout {
      const vw = window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const compact = vw < 640;

      if (compact) {
        const fromW = Math.floor((vw - 16) / 9);
        const fromH = Math.floor((vh - 180) / 9);
        return { cellSize: Math.max(32, Math.min(fromW, fromH)), compact: true };
      }

      const fromH = Math.floor((vh - 260) / 9);
      const fromW = Math.floor((vw - 260) / 9);
      return { cellSize: Math.max(48, Math.min(fromH, fromW)), compact: false };
    }
    setLayout(calc());
    const handler = () => setLayout(calc());
    const vp = window.visualViewport;
    if (vp) vp.addEventListener("resize", handler);
    window.addEventListener("resize", handler);
    return () => {
      if (vp) vp.removeEventListener("resize", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  return layout;
}
