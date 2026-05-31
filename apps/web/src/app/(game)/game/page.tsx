"use client";

import { GameView } from "@/components/GameView";

export default function GamePage() {
  return (
    <GameView
      onBack={() => {
        if (window.parent !== window) {
          window.parent.postMessage({ type: "ebishogi:back" }, "*");
        } else {
          window.location.href = "/";
        }
      }}
    />
  );
}
