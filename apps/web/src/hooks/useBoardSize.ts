"use client";

import { useState, useEffect } from "react";

export function useBoardSize(): number {
  const [cellSize, setCellSize] = useState(64);

  useEffect(() => {
    function calc() {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const fromH = Math.floor((vh - 260) / 9);
      const fromW = Math.floor((vw - 260) / 9);
      return Math.max(48, Math.min(fromH, fromW));
    }
    setCellSize(calc());
    const handler = () => setCellSize(calc());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return cellSize;
}
