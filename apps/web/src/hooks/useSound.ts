"use client";

import { useRef, useCallback } from "react";

export function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playMove = useCallback(() => {
    if (!enabled) return;
    playWoodTap(getCtx(), false);
  }, [enabled, getCtx]);

  const playCapture = useCallback(() => {
    if (!enabled) return;
    playWoodTap(getCtx(), true);
  }, [enabled, getCtx]);

  const playCheck = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    playTone(ctx, 880, 0.08, 0.25);
    setTimeout(() => playTone(ctx, 1100, 0.1, 0.2), 100);
  }, [enabled, getCtx]);

  return { playMove, playCapture, playCheck };
}

function playWoodTap(ctx: AudioContext, heavy: boolean) {
  const duration = heavy ? 0.1 : 0.06;
  const len = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < len; i++) {
    const t = i / ctx.sampleRate;
    const noise = Math.random() * 2 - 1;
    const tone = Math.sin(2 * Math.PI * (heavy ? 200 : 350) * t);
    const envelope = Math.exp(-t * (heavy ? 35 : 55));
    data[i] = (noise * 0.6 + tone * 0.4) * envelope;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = heavy ? 600 : 900;
  filter.Q.value = 1.5;

  const gain = ctx.createGain();
  gain.gain.value = heavy ? 0.4 : 0.3;

  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(ctx.currentTime);
}

function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  volume: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}
