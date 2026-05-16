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
    playWoodSlam(getCtx(), false);
  }, [enabled, getCtx]);

  const playCapture = useCallback(() => {
    if (!enabled) return;
    playWoodSlam(getCtx(), true);
    setTimeout(() => playCrash(getCtx()), 30);
  }, [enabled, getCtx]);

  const playCheck = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    playDramaticChime(ctx);
  }, [enabled, getCtx]);

  return { playMove, playCapture, playCheck };
}

function playWoodSlam(ctx: AudioContext, heavy: boolean) {
  const duration = heavy ? 0.15 : 0.08;
  const len = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  const freq = heavy ? 180 : 320;
  for (let i = 0; i < len; i++) {
    const t = i / ctx.sampleRate;
    const noise = Math.random() * 2 - 1;
    const tone = Math.sin(2 * Math.PI * freq * t);
    const sub = Math.sin(2 * Math.PI * 80 * t) * 0.3;
    const envelope = Math.exp(-t * (heavy ? 25 : 45));
    data[i] = (noise * 0.5 + tone * 0.35 + sub) * envelope;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = heavy ? 500 : 800;
  filter.Q.value = 1.2;

  const gain = ctx.createGain();
  gain.gain.value = heavy ? 0.55 : 0.35;

  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(ctx.currentTime);
}

function playCrash(ctx: AudioContext) {
  const duration = 0.25;
  const len = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < len; i++) {
    const t = i / ctx.sampleRate;
    const noise = Math.random() * 2 - 1;
    const crackle = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 60);
    const envelope = Math.exp(-t * 12);
    data[i] = (noise * 0.7 + crackle * 0.3) * envelope;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 400;

  const gain = ctx.createGain();
  gain.gain.value = 0.2;

  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(ctx.currentTime);
}

function playDramaticChime(ctx: AudioContext) {
  const notes = [880, 1100, 1320];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    const start = ctx.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0.2, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.15);
  });
}
