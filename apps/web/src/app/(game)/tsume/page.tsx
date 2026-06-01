"use client";

import { useState, useEffect } from "react";
import { TsumeView } from "@/components/TsumeView";

export default function TsumePage() {
  // SSR とクライアントでキャンバスサイズがずれないよう、マウント後に描画する
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <TsumeView onBack={() => (window.location.href = "/")} />;
}
