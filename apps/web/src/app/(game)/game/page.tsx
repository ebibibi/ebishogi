"use client";

import { GameView } from "@/components/GameView";

export default function GamePage() {
  return <GameView onBack={() => (window.location.href = "/")} />;
}
