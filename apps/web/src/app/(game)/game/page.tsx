"use client";

import { useState, useEffect } from "react";
import { GameView } from "@/components/GameView";

export default function GamePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <GameView onBack={() => (window.location.href = "/")} />;
}
