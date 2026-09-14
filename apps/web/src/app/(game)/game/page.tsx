"use client";

import { GameView } from "@/components/GameView";
import { useHydrated } from "@/hooks/useHydrated";

export default function GamePage() {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return <GameView onBack={() => (window.location.href = "/")} />;
}
