"use client";

import { TsumeView } from "@/components/TsumeView";
import { useHydrated } from "@/hooks/useHydrated";

export default function TsumePage() {
  // SSR とクライアントでキャンバスサイズがずれないよう、マウント後に描画する
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return <TsumeView onBack={() => (window.location.href = "/")} />;
}
