"use client";

import type { ReactNode } from "react";

type Props = {
  canTakeBack: boolean;
  canStepBack: boolean;
  canStepForward: boolean;
  isLive: boolean;
  onTakeBack: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onGoToLatest: () => void;
  onResume: () => void;
};

export function GameControls({
  canTakeBack,
  canStepBack,
  canStepForward,
  isLive,
  onTakeBack,
  onStepBack,
  onStepForward,
  onGoToLatest,
  onResume,
}: Props) {
  return (
    <div className="flex items-center gap-1.5 mt-2 justify-center">
      <button
        onClick={onTakeBack}
        disabled={!canTakeBack}
        className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
        type="button"
      >
        待った
      </button>

      <div className="flex items-center gap-0.5 ml-1">
        <NavBtn onClick={onStepBack} disabled={!canStepBack}>
          ◀
        </NavBtn>
        <NavBtn onClick={onStepForward} disabled={!canStepForward}>
          ▶
        </NavBtn>
        <NavBtn onClick={onGoToLatest} disabled={isLive}>
          ▶▶
        </NavBtn>
      </div>

      {!isLive && (
        <button
          onClick={onResume}
          className="ml-2 px-3 py-1.5 text-xs bg-amber-600/80 hover:bg-amber-500 rounded-lg transition-colors text-amber-100"
          type="button"
        >
          ここから再開
        </button>
      )}
    </div>
  );
}

function NavBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors flex items-center justify-center"
      type="button"
    >
      {children}
    </button>
  );
}
