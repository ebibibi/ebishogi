"use client";

import { useSyncExternalStore } from "react";

/** マウント後は再購読しないので、購読解除だけ返す no-op。 */
function subscribe() {
  return () => {};
}

/**
 * サーバー描画（および hydration の初回描画）では false、
 * クライアントで hydration が終わったら true を返す。
 *
 * `useState` + `useEffect(() => setMounted(true))` と同じ用途だが、
 * effect 内での setState を伴わないため React Compiler のルールに適合する。
 * canvas のように SSR とクライアントで寸法がずれる描画の出し分けに使う。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
