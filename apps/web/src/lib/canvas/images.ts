const PIECE_IMAGES: Record<string, string> = {
  king: "/pieces/king.png",
  rook: "/pieces/rook.png",
  bishop: "/pieces/bishop.png",
  gold: "/pieces/gold.png",
  silver: "/pieces/silver.png",
  knight: "/pieces/knight.png",
  lance: "/pieces/lance.png",
  pawn: "/pieces/pawn.png",
  dragon: "/pieces/dragon.png",
  horse: "/pieces/horse.png",
  promotedsilver: "/pieces/promotedsilver.png",
  promotedknight: "/pieces/promotedknight.png",
  promotedlance: "/pieces/promotedlance.png",
  tokin: "/pieces/tokin.png",
};

export async function loadPieceImages(): Promise<
  Map<string, HTMLImageElement>
> {
  const map = new Map<string, HTMLImageElement>();
  await Promise.all(
    Object.entries(PIECE_IMAGES).map(
      ([role, src]) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            map.set(role, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  );
  return map;
}
