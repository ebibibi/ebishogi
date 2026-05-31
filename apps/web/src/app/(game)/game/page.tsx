"use client";

import { useState, useEffect } from "react";
import { GameView } from "@/components/GameView";

export default function GamePage() {
  const [debug, setDebug] = useState<string>("checking...");

  useEffect(() => {
    const coi = self.crossOriginIsolated;
    const sab = typeof SharedArrayBuffer !== "undefined";
    setDebug(`COI:${coi} SAB:${sab}`);
  }, []);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.8)",
          color: debug.includes("true") ? "#0f0" : "#f00",
          padding: "4px 8px",
          fontSize: "12px",
          fontFamily: "monospace",
        }}
      >
        {debug}
      </div>
      <GameView onBack={() => (window.location.href = "/")} />
    </>
  );
}
