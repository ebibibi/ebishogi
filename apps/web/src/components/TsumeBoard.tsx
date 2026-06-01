"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { MoveOrDrop, Square, Role, Piece } from "shogiops/types";
import type { Shogi } from "shogiops/variant/shogi";
import { loadPieceImages } from "@/lib/canvas/images";
import { coordsToSquare, canPromote, mustPromote } from "@/lib/shogi-game";
import { calcTsumeLayout, type TsumeLayout } from "@/lib/tsume/tsume-layout";
import { drawTsume } from "@/lib/tsume/tsume-renderer";
import { hitTestTsume } from "@/lib/tsume/tsume-hit-test";

type Props = {
  position: Shogi;
  lastMove: MoveOrDrop | null;
  interactive: boolean;
  onMove: (move: MoveOrDrop) => void;
};

function computeLayout(): TsumeLayout {
  const vw =
    typeof window !== "undefined" ? Math.min(window.innerWidth - 24, 460) : 360;
  const vh =
    typeof window !== "undefined"
      ? (window.visualViewport?.height ?? window.innerHeight) * 0.64
      : 600;
  return calcTsumeLayout(vw, vh);
}

function goteKingSquare(pos: Shogi): Square | null {
  for (const sq of pos.kingsOf("gote")) return sq as Square;
  return null;
}

function toSet(squares: Iterable<number>): Set<number> {
  const set = new Set<number>();
  for (const sq of squares) set.add(sq);
  return set;
}

export function TsumeBoard({ position, lastMove, interactive, onMove }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(
    () => new Map(),
  );
  const [layout, setLayout] = useState<TsumeLayout>(computeLayout);
  const [selected, setSelected] = useState<Square | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<Role | null>(null);
  const [legalDests, setLegalDests] = useState<Set<number>>(new Set());
  const [showPromotion, setShowPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  useEffect(() => {
    loadPieceImages().then(setImages);
  }, []);

  useEffect(() => {
    const handler = () => setLayout(computeLayout());
    handler();
    window.addEventListener("resize", handler);
    window.visualViewport?.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
      window.visualViewport?.removeEventListener("resize", handler);
    };
  }, []);

  // 局面が変わったら選択状態をリセット
  useEffect(() => {
    setSelected(null);
    setSelectedDrop(null);
    setLegalDests(new Set());
    setShowPromotion(null);
  }, [position]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawTsume(
      ctx,
      layout,
      {
        position,
        lastMove,
        selected,
        selectedDrop,
        legalDests,
        checkSquare: position.isCheck() ? goteKingSquare(position) : null,
        showPromotion,
      },
      images,
    );
  });

  const clearSelection = useCallback(() => {
    setSelected(null);
    setSelectedDrop(null);
    setLegalDests(new Set());
  }, []);

  const handleSquare = useCallback(
    (file: number, rank: number) => {
      if (!interactive) return;
      const target = coordsToSquare(file, rank);

      if (selectedDrop) {
        const piece: Piece = { role: selectedDrop, color: position.turn };
        if (position.dropDests(piece).has(target)) {
          clearSelection();
          onMove({ role: selectedDrop, to: target });
        } else {
          clearSelection();
        }
        return;
      }

      if (selected !== null) {
        if (legalDests.has(target)) {
          if (
            canPromote(position, selected, target) &&
            !mustPromote(position, selected, target)
          ) {
            setShowPromotion({ from: selected, to: target });
            return;
          }
          clearSelection();
          onMove({
            from: selected,
            to: target,
            promotion: mustPromote(position, selected, target) || undefined,
          });
          return;
        }
        clearSelection();
      }

      const piece = position.board.get(target);
      if (piece && piece.color === position.turn) {
        setSelected(target);
        setLegalDests(toSet(position.moveDests(target)));
      }
    },
    [interactive, position, selected, selectedDrop, legalDests, onMove, clearSelection],
  );

  const handleHand = useCallback(
    (role: Role) => {
      if (!interactive) return;
      setSelected(null);
      setSelectedDrop(role);
      const piece: Piece = { role, color: position.turn };
      setLegalDests(toSet(position.dropDests(piece)));
    },
    [interactive, position],
  );

  const handlePromotion = useCallback(
    (promote: boolean) => {
      if (!showPromotion) return;
      const move: MoveOrDrop = {
        from: showPromotion.from,
        to: showPromotion.to,
        promotion: promote || undefined,
      };
      setShowPromotion(null);
      clearSelection();
      onMove(move);
    },
    [showPromotion, onMove, clearSelection],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const hit = hitTestTsume(
        layout,
        e.clientX - rect.left,
        e.clientY - rect.top,
        { position, showPromotion },
      );
      if (!hit) return;
      if (hit.type === "square") handleSquare(hit.file, hit.rank);
      else if (hit.type === "hand") handleHand(hit.role);
      else if (hit.type === "promotion") handlePromotion(hit.promote);
    },
    [layout, position, showPromotion, handleSquare, handleHand, handlePromotion],
  );

  return (
    <canvas
      ref={canvasRef}
      width={layout.cw * layout.dpr}
      height={layout.ch * layout.dpr}
      style={{
        width: layout.cw,
        height: layout.ch,
        touchAction: "manipulation",
        display: "block",
      }}
      onClick={handleClick}
    />
  );
}
