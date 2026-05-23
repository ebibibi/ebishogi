"use client";

import { useRef, useCallback, useEffect } from "react";

const SOUND_URLS = {
  move: "/sounds/move.mp3",
  capture: "/sounds/capture.mp3",
} as const;

type SoundBuffers = Record<keyof typeof SOUND_URLS, AudioBuffer | null>;

export function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<SoundBuffers>({ move: null, capture: null });

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const ctx = getCtx();
    for (const [key, url] of Object.entries(SOUND_URLS)) {
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          buffersRef.current[key as keyof typeof SOUND_URLS] = decoded;
        });
    }
  }, [enabled, getCtx]);

  const playBuffer = useCallback(
    (key: keyof typeof SOUND_URLS) => {
      if (!enabled) return;
      const ctx = getCtx();
      const buffer = buffersRef.current[key];
      if (!buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.3;
      source.connect(gain).connect(ctx.destination);
      source.start();
    },
    [enabled, getCtx],
  );

  const playMove = useCallback(() => playBuffer("move"), [playBuffer]);
  const playCapture = useCallback(() => playBuffer("capture"), [playBuffer]);
  const playCheck = useCallback(() => playBuffer("capture"), [playBuffer]);

  return { playMove, playCapture, playCheck };
}
