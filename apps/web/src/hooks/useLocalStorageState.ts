"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * localStorage に JSON で永続化する状態。
 *
 * effect 内で setState して読み込む形だと React Compiler のルールに触れるうえ、
 * 「既定値で1フレーム描画してから実際の値に差し替わる」ちらつきが避けられない。
 * useSyncExternalStore なら localStorage をそのまま外部ストアとして扱えるので、
 * SSR では既定値、クライアントでは保存値を最初の描画から返せる。
 *
 * 同一タブの更新は CustomEvent、別タブの更新は storage イベントで購読する。
 */

const CHANGE_EVENT = "ebishogi:localstorage";

function emitChange(key: string): void {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

function subscribeTo(key: string, onChange: () => void): () => void {
  const handleSame = (e: Event) => {
    if ((e as CustomEvent<string>).detail === key) onChange();
  };
  const handleOther = (e: StorageEvent) => {
    if (e.key === null || e.key === key) onChange();
  };
  window.addEventListener(CHANGE_EVENT, handleSame);
  window.addEventListener("storage", handleOther);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleSame);
    window.removeEventListener("storage", handleOther);
  };
}

/**
 * useSyncExternalStore は getSnapshot が毎回同じ参照を返すことを要求する
 * （違うと無限ループになる）。生文字列をキャッシュのキーにして、
 * 内容が変わったときだけ新しいオブジェクトを作る。
 */
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();

/** localStorage が使えない環境（プライベートモード等）での置き場。 */
const memoryStore = new Map<string, unknown>();

function readSnapshot<T>(key: string, fallback: T, merge: boolean): T {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return memoryStore.has(key) ? (memoryStore.get(key) as T) : fallback;
  }

  const cached = snapshotCache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value: T = fallback;
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as T;
      value = merge ? { ...fallback, ...parsed } : parsed;
    } catch {
      value = fallback; // 壊れた JSON は既定値に倒す
    }
  }
  snapshotCache.set(key, { raw, value });
  return value;
}

type Options = {
  /** true なら保存値を既定値に浅くマージする（設定オブジェクト向け）。 */
  readonly merge?: boolean;
};

type Updater<T> = T | ((prev: T) => T);

export function useLocalStorageState<T>(
  key: string,
  fallback: T,
  { merge = false }: Options = {},
): readonly [T, (next: Updater<T>) => void, () => void] {
  const subscribe = useCallback(
    (onChange: () => void) => subscribeTo(key, onChange),
    [key],
  );
  const getSnapshot = useCallback(
    () => readSnapshot(key, fallback, merge),
    [key, fallback, merge],
  );
  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (updater: Updater<T>) => {
      // 保存済みの値を読み直してから適用する。連続更新でも取りこぼさない。
      const next =
        typeof updater === "function"
          ? (updater as (prev: T) => T)(readSnapshot(key, fallback, merge))
          : updater;
      try {
        localStorage.setItem(key, JSON.stringify(next));
        memoryStore.delete(key);
      } catch {
        // 永続化はできないが、セッション中は変更を反映させる
        memoryStore.set(key, next);
      }
      snapshotCache.delete(key);
      emitChange(key);
    },
    [key, fallback, merge],
  );

  const clearValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* 削除できなくても画面は更新する */
    }
    memoryStore.delete(key);
    snapshotCache.delete(key);
    emitChange(key);
  }, [key]);

  return [value, setValue, clearValue] as const;
}
