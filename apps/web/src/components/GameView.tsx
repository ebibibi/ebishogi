"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MoveOrDrop, Color, Square, Role, Piece } from "shogiops/types";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useAIAssist, EVAL_DISPLAY_MS } from "@/hooks/useAIAssist";
import { useGameHistory } from "@/hooks/useGameHistory";
import { useSettings, CPU_LEVELS } from "@/hooks/useSettings";
import { useSound } from "@/hooks/useSound";
import { useTimer } from "@/hooks/useTimer";
import { makeUsi } from "shogiops/util";
import {
  applyMoveToGame,
  usiToMove,
  squareToCoords,
  coordsToSquare,
  canPromote,
  mustPromote,
} from "@/lib/shogi-game";
import { getEngine } from "@/lib/engine";
import { calcLayout, type CanvasLayout } from "@/lib/canvas/layout";
import { loadPieceImages } from "@/lib/canvas/images";
import {
  drawCanvas,
  createParticles,
  type AnimState,
  type RenderState,
} from "@/lib/canvas/renderer";
import { hitTest } from "@/lib/canvas/hit-test";

export function GameView({ onBack }: { onBack: () => void }) {
  const {
    game,
    viewIndex,
    isLive,
    canTakeBack,
    canStepBack,
    canStepForward,
    pushMove,
    takeBack,
    stepBack,
    stepForward,
    goToLatest,
    goTo,
    resumeFromCurrent,
    reset,
    evalHistory,
  } = useGameHistory();

  const { settings, updateSettings, resetSettings } = useSettings();
  const [playerColor] = useState<Color>("sente");
  const { senteTime, goteTime, reset: resetTimer } = useTimer(
    game.turn,
    isLive,
    game.moveCount,
  );
  const [aiThinking, setAiThinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const abortRef = useRef(false);
  const aiThinkingRef = useRef(false);
  const lastPlayerMoveUsiRef = useRef<string | null>(null);

  const isPlayerTurn = game.turn === playerColor;
  const isInteractive = isLive && isPlayerTurn && !game.isEnd;
  const flipped = playerColor === "gote";

  const {
    arrows,
    badMoveAlert,
    moveEvaluation,
    engineReady,
    currentEval,
    evaluatePlayerMove,
    thinkingElapsed,
  } = useAIAssist(game, isPlayerTurn && isLive, settings);

  const { playMove, playCapture, playCheck } = useSound(
    settings.soundEnabled,
  );

  // ── Canvas ──────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(
    () => new Map(),
  );
  const [layout, setLayout] = useState<CanvasLayout>(() => {
    if (typeof window === "undefined") return calcLayout(400, 700);
    return calcLayout(
      window.innerWidth,
      window.visualViewport?.height ?? window.innerHeight,
    );
  });

  const [selected, setSelected] = useState<Square | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<Role | null>(null);
  const [legalDests, setLegalDests] = useState<Set<number>>(new Set());
  const [showPromotion, setShowPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [, forceRender] = useState(0);
  const animRef = useRef<AnimState>({
    particles: [],
    captureTime: 0,
    flash: false,
    shakeX: 0,
    moveRipple: null,
    cpuImpact: null,
    alertAnim: null,
    moveEvalAnim: null,
    gameEndAnim: null,
  });

  useEffect(() => {
    loadPieceImages().then(setImages);
  }, []);

  useEffect(() => {
    const handler = () => {
      const vh =
        window.visualViewport?.height ?? window.innerHeight;
      setLayout(calcLayout(window.innerWidth, vh));
    };
    window.addEventListener("resize", handler);
    window.visualViewport?.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
      window.visualViewport?.removeEventListener("resize", handler);
    };
  }, []);

  useEffect(() => {
    setSelected(null);
    setSelectedDrop(null);
    setLegalDests(new Set());
  }, [game.position]);

  useEffect(() => {
    if (!badMoveAlert) {
      animRef.current.alertAnim = null;
      return;
    }
    let cancelled = false;
    animRef.current.alertAnim = {
      text: badMoveAlert.message,
      severity: badMoveAlert.severity,
      startTime: performance.now(),
    };
    const animate = () => {
      if (cancelled || !animRef.current.alertAnim) return;
      const elapsed =
        (performance.now() - animRef.current.alertAnim.startTime) / 1000;
      if (elapsed < 3.0) {
        forceRender((n) => n + 1);
        requestAnimationFrame(animate);
      } else {
        animRef.current.alertAnim = null;
        forceRender((n) => n + 1);
      }
    };
    requestAnimationFrame(animate);
    return () => {
      cancelled = true;
    };
  }, [badMoveAlert]);

  useEffect(() => {
    if (!moveEvaluation) {
      animRef.current.moveEvalAnim = null;
      return;
    }
    let cancelled = false;
    animRef.current.moveEvalAnim = {
      evaluation: moveEvaluation,
      startTime: performance.now(),
    };
    const animate = () => {
      if (cancelled || !animRef.current.moveEvalAnim) return;
      const elapsed =
        (performance.now() - animRef.current.moveEvalAnim.startTime) / 1000;
      if (elapsed < 3.0) {
        forceRender((n) => n + 1);
        requestAnimationFrame(animate);
      } else {
        animRef.current.moveEvalAnim = null;
        forceRender((n) => n + 1);
      }
    };
    requestAnimationFrame(animate);
    return () => {
      cancelled = true;
    };
  }, [moveEvaluation]);

  useEffect(() => {
    if (!game.isEnd || !message) {
      animRef.current.gameEndAnim = null;
      return;
    }
    if (animRef.current.gameEndAnim) return;
    const kind = message.includes("あなたの勝ち")
      ? ("win" as const)
      : message.includes("CPU")
        ? ("lose" as const)
        : ("draw" as const);
    animRef.current.gameEndAnim = {
      text: message,
      kind,
      startTime: performance.now(),
    };
    let cancelled = false;
    const animate = () => {
      if (cancelled) return;
      const elapsed =
        (performance.now() - (animRef.current.gameEndAnim?.startTime ?? 0)) /
        1000;
      if (elapsed < 0.5) {
        forceRender((n) => n + 1);
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
    return () => {
      cancelled = true;
    };
  }, [game.isEnd, message]);

  const checkSquare = game.isCheck
    ? findKingSquare(game.position, game.turn)
    : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state: RenderState = {
      position: game.position,
      turn: game.turn,
      moveCount: game.moveCount,
      isCheck: game.isCheck,
      isEnd: game.isEnd,
      lastMove: game.lastMove,
      playerColor,
      flipped,
      selected,
      selectedDrop,
      legalDests,
      arrows,
      evalHistory,
      currentEval,
      viewIndex,
      thinkingElapsed,
      settings,
      senteTime,
      goteTime,
      message,
      badMoveAlert,
      isLive,
      engineReady,
      aiThinking,
      canTakeBack,
      canStepBack,
      canStepForward,
      showPromotion,
      checkSquare,
    };

    drawCanvas(ctx, layout, state, images, animRef.current);
  });

  // ── Capture effects ─────────────────────────────────
  const triggerCapture = useCallback(
    (sq: number) => {
      const { file, rank } = squareToCoords(sq);
      animRef.current.particles = createParticles(
        file,
        rank,
        flipped,
        layout.cellSize,
      );
      animRef.current.captureTime = performance.now();
      animRef.current.flash = true;
      setTimeout(() => {
        animRef.current.flash = false;
        forceRender((n) => n + 1);
      }, 120);

      const start = performance.now();
      const shake = () => {
        const elapsed = performance.now() - start;
        if (elapsed > 200) {
          animRef.current.shakeX = 0;
          forceRender((n) => n + 1);
          return;
        }
        animRef.current.shakeX =
          Math.sin(elapsed * 0.05) * 4 * (1 - elapsed / 200);
        forceRender((n) => n + 1);
        requestAnimationFrame(shake);
      };

      const animateParticles = () => {
        const elapsed =
          (performance.now() - animRef.current.captureTime) / 1000;
        if (elapsed < 0.5) {
          forceRender((n) => n + 1);
          requestAnimationFrame(animateParticles);
        } else {
          animRef.current.particles = [];
          forceRender((n) => n + 1);
        }
      };

      requestAnimationFrame(shake);
      requestAnimationFrame(animateParticles);
    },
    [flipped, layout.cellSize],
  );

  const triggerMoveRipple = useCallback(
    (sq: number) => {
      const { file, rank } = squareToCoords(sq);
      const col = flipped ? file - 1 : 9 - file;
      const row = flipped ? 9 - rank : rank - 1;
      animRef.current.moveRipple = {
        cx: col * layout.cellSize + layout.cellSize / 2,
        cy: row * layout.cellSize + layout.cellSize / 2,
        startTime: performance.now(),
      };
      const animate = () => {
        if (!animRef.current.moveRipple) return;
        const elapsed =
          (performance.now() - animRef.current.moveRipple.startTime) / 1000;
        if (elapsed < 0.4) {
          forceRender((n) => n + 1);
          requestAnimationFrame(animate);
        } else {
          animRef.current.moveRipple = null;
          forceRender((n) => n + 1);
        }
      };
      requestAnimationFrame(animate);
    },
    [flipped, layout.cellSize],
  );

  const triggerCpuImpact = useCallback(
    (sq: number) => {
      const { file, rank } = squareToCoords(sq);
      const col = flipped ? file - 1 : 9 - file;
      const row = flipped ? 9 - rank : rank - 1;
      const cx = col * layout.cellSize + layout.cellSize / 2;
      const cy = row * layout.cellSize + layout.cellSize / 2;
      animRef.current.cpuImpact = { cx, cy, startTime: performance.now() };
      animRef.current.flash = true;
      setTimeout(() => {
        animRef.current.flash = false;
        forceRender((n) => n + 1);
      }, 80);

      const start = performance.now();
      const shake = () => {
        const e = performance.now() - start;
        if (e > 250) {
          animRef.current.shakeX = 0;
          forceRender((n) => n + 1);
          return;
        }
        animRef.current.shakeX =
          Math.sin(e * 0.06) * 5 * (1 - e / 250);
        forceRender((n) => n + 1);
        requestAnimationFrame(shake);
      };

      const animateImpact = () => {
        if (!animRef.current.cpuImpact) return;
        const e =
          (performance.now() - animRef.current.cpuImpact.startTime) / 1000;
        if (e < 0.7) {
          forceRender((n) => n + 1);
          requestAnimationFrame(animateImpact);
        } else {
          animRef.current.cpuImpact = null;
          forceRender((n) => n + 1);
        }
      };

      requestAnimationFrame(shake);
      requestAnimationFrame(animateImpact);

      animRef.current.particles = createParticles(
        file,
        rank,
        flipped,
        layout.cellSize,
      );
      animRef.current.captureTime = performance.now();
      const animateParticles = () => {
        const e = (performance.now() - animRef.current.captureTime) / 1000;
        if (e < 0.5) {
          forceRender((n) => n + 1);
          requestAnimationFrame(animateParticles);
        } else {
          animRef.current.particles = [];
          forceRender((n) => n + 1);
        }
      };
      requestAnimationFrame(animateParticles);
    },
    [flipped, layout.cellSize],
  );

  // ── Move execution ──────────────────────────────────
  const commitMove = useCallback(
    (move: MoveOrDrop) => {
      const newGame = applyMoveToGame(game, move);
      if (!newGame) return;

      lastPlayerMoveUsiRef.current = makeUsi(move);

      const isCapt =
        "from" in move &&
        game.position.board.get(move.to) !== undefined;
      if (isCapt) {
        playCapture();
        triggerCapture(move.to);
      } else {
        playMove();
        triggerMoveRipple(move.to);
      }

      pushMove(newGame, currentEval);
      setMessage(null);

      if (newGame.isCheck && !newGame.isEnd) {
        playCheck();
        setMessage("王手！");
      }
      if (newGame.isEnd) {
        const winner = newGame.outcome?.winner;
        if (winner === playerColor) setMessage("あなたの勝ち！");
        else if (winner) setMessage("CPUの勝ち...");
        else setMessage("引き分け");
      }
    },
    [
      game,
      playerColor,
      currentEval,
      pushMove,
      playMove,
      playCapture,
      playCheck,
      triggerCapture,
      triggerMoveRipple,
    ],
  );

  const handleSquareClick = useCallback(
    (file: number, rank: number) => {
      if (!isInteractive) return;
      const sq = coordsToSquare(file, rank);

      if (showPromotion) {
        setShowPromotion(null);
        return;
      }

      if (selectedDrop) {
        const piece: Piece = {
          role: selectedDrop,
          color: game.position.turn,
        };
        const dests = game.position.dropDests(piece);
        if (dests.has(sq)) {
          commitMove({ role: selectedDrop, to: sq });
        }
        setSelectedDrop(null);
        setLegalDests(new Set());
        return;
      }

      if (selected !== null) {
        if (legalDests.has(sq)) {
          if (
            canPromote(game.position, selected, sq) &&
            !mustPromote(game.position, selected, sq)
          ) {
            setShowPromotion({ from: selected, to: sq });
            return;
          }
          commitMove({
            from: selected,
            to: sq,
            promotion:
              mustPromote(game.position, selected, sq) || undefined,
          });
          return;
        }
        setSelected(null);
        setLegalDests(new Set());
      }

      const piece = game.position.board.get(sq);
      if (piece && piece.color === game.position.turn) {
        setSelected(sq);
        const dests = game.position.moveDests(sq);
        const destSet = new Set<number>();
        for (const d of dests) destSet.add(d);
        setLegalDests(destSet);
      }
    },
    [
      isInteractive,
      game,
      selected,
      selectedDrop,
      legalDests,
      showPromotion,
      commitMove,
    ],
  );

  const handleHandClick = useCallback(
    (role: Role) => {
      if (!isInteractive) return;
      setSelected(null);
      setSelectedDrop(role);
      const piece: Piece = { role, color: game.position.turn };
      const dests = game.position.dropDests(piece);
      const destSet = new Set<number>();
      for (const d of dests) destSet.add(d);
      setLegalDests(destSet);
    },
    [isInteractive, game],
  );

  const handlePromotion = useCallback(
    (promote: boolean) => {
      if (!showPromotion) return;
      commitMove({
        from: showPromotion.from,
        to: showPromotion.to,
        promotion: promote || undefined,
      });
      setShowPromotion(null);
    },
    [showPromotion, commitMove],
  );

  // ── Reset / TakeBack ────────────────────────────────
  const handleReset = useCallback(() => {
    abortRef.current = true;
    aiThinkingRef.current = false;
    getEngine().cancelSearch();
    reset();
    resetTimer();
    setMessage(null);
    setAiThinking(false);
    setShowPromotion(null);
  }, [reset, resetTimer]);

  const handleTakeBack = useCallback(() => {
    abortRef.current = true;
    aiThinkingRef.current = false;
    getEngine().cancelSearch();
    takeBack();
    setMessage(null);
    setAiThinking(false);
    setShowPromotion(null);
  }, [takeBack]);

  // ── AI move ─────────────────────────────────────────
  useEffect(() => {
    if (!isLive || game.isEnd || isPlayerTurn || aiThinkingRef.current)
      return;

    aiThinkingRef.current = true;
    setAiThinking(true);
    abortRef.current = false;

    const run = async () => {
      try {
        const engine = getEngine();
        const level =
          CPU_LEVELS[settings.cpuLevel] ??
          CPU_LEVELS[CPU_LEVELS.length - 1];
        const result = await engine.search(
          game.sfen,
          level.depth > 0
            ? { multiPV: level.candidates, depth: level.depth }
            : { multiPV: 1, timeMs: 500 },
        );
        if (abortRef.current) return;

        let evalShown = false;
        if (result.candidates.length > 0 && lastPlayerMoveUsiRef.current) {
          evalShown = evaluatePlayerMove(
            result.candidates[0].score,
            lastPlayerMoveUsiRef.current,
          );
        }

        const waitMs = evalShown
          ? Math.max(settings.cpuMoveDelay, EVAL_DISPLAY_MS)
          : settings.cpuMoveDelay;
        if (waitMs > 0) {
          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, waitMs);
            const check = setInterval(() => {
              if (abortRef.current) {
                clearTimeout(t);
                clearInterval(check);
                resolve();
              }
            }, 100);
            setTimeout(
              () => clearInterval(check),
              waitMs + 50,
            );
          });
        }
        if (abortRef.current) return;

        let chosenIdx = 0;
        if (level.candidates > 1 && result.candidates.length > 1) {
          chosenIdx = Math.floor(
            Math.random() *
              Math.min(level.candidates, result.candidates.length),
          );
        }
        const chosen = result.candidates[chosenIdx];
        const usi = chosen?.usi ?? result.bestmove;
        if (!usi) return;
        const move = usiToMove(usi);
        if (!move) return;
        const newGame = applyMoveToGame(game, move);
        if (!newGame) return;

        const isCapt =
          "from" in move &&
          game.position.board.get(move.to) !== undefined;
        if (isCapt) {
          playCapture();
          triggerCapture(move.to);
        } else {
          playMove();
        }
        triggerCpuImpact(move.to);

        const cpuScore = chosen?.score;
        pushMove(
          newGame,
          cpuScore !== undefined ? -cpuScore : null,
        );

        if (newGame.isCheck && !newGame.isEnd) {
          playCheck();
          setMessage("王手！");
        } else {
          setMessage(null);
        }
        if (newGame.isEnd) {
          const winner = newGame.outcome?.winner;
          if (winner === playerColor) setMessage("あなたの勝ち！");
          else if (winner) setMessage("CPUの勝ち...");
          else setMessage("引き分け");
        }
      } catch {
        /* engine unavailable */
      } finally {
        aiThinkingRef.current = false;
        if (!abortRef.current) setAiThinking(false);
      }
    };

    run();
    return () => {
      abortRef.current = true;
    };
  }, [
    game,
    isPlayerTurn,
    isLive,
    playerColor,
    settings.cpuMoveDelay,
    settings.cpuLevel,
    evaluatePlayerMove,
    pushMove,
    playMove,
    playCapture,
    playCheck,
    triggerCapture,
    triggerCpuImpact,
  ]);

  // ── Canvas click ────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const hit = hitTest(layout, x, y, {
        flipped,
        position: game.position,
        playerColor,
        showPromotion,
        canTakeBack: canTakeBack && isLive,
        canStepBack,
        canStepForward,
        isLive,
        evalHistory,
      });

      if (!hit) return;

      switch (hit.type) {
        case "square":
          handleSquareClick(hit.file, hit.rank);
          break;
        case "hand":
          handleHandClick(hit.role);
          break;
        case "promotion":
          handlePromotion(hit.promote);
          break;
        case "evalGraph":
          goTo(hit.index);
          break;
        case "button":
          switch (hit.action) {
            case "takeback":
              handleTakeBack();
              break;
            case "stepBack":
              stepBack();
              break;
            case "stepForward":
              stepForward();
              break;
            case "goToLatest":
              goToLatest();
              break;
            case "resume":
              resumeFromCurrent();
              break;
            case "reset":
              handleReset();
              break;
            case "settings":
              setShowSettings(true);
              break;
            case "back":
              onBack();
              break;
          }
          break;
      }
    },
    [
      layout,
      flipped,
      game.position,
      playerColor,
      showPromotion,
      canTakeBack,
      canStepBack,
      canStepForward,
      isLive,
      evalHistory,
      handleSquareClick,
      handleHandClick,
      handlePromotion,
      goTo,
      handleTakeBack,
      stepBack,
      stepForward,
      goToLatest,
      resumeFromCurrent,
      handleReset,
      onBack,
    ],
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        width={layout.canvasW * layout.dpr}
        height={layout.canvasH * layout.dpr}
        style={{
          width: layout.canvasW,
          height: layout.canvasH,
          touchAction: "manipulation",
          display: "block",
        }}
        onClick={handleCanvasClick}
      />
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onReset={resetSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}

function findKingSquare(
  position: { kingsOf: (c: Color) => Iterable<number> },
  color: Color,
): Square | null {
  for (const sq of position.kingsOf(color)) return sq as Square;
  return null;
}
