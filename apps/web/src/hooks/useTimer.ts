"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Color } from "shogiops/types";

export function useTimer(turn: Color, isLive: boolean, moveCount: number) {
  const [senteTime, setSenteTime] = useState(0);
  const [goteTime, setGoteTime] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLive || moveCount === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (turn === "sente") {
        setSenteTime((prev) => prev + 1);
      } else {
        setGoteTime((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [turn, isLive, moveCount]);

  const reset = useCallback(() => {
    setSenteTime(0);
    setGoteTime(0);
  }, []);

  return { senteTime, goteTime, reset };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
