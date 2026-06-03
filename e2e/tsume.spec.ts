import { test, expect, type Page } from "@playwright/test";
import problemsData from "../apps/web/src/lib/tsume/problems.json";
import { calcLayout, fileRankToPixel } from "../apps/web/src/lib/canvas/layout";

// 実践詰将棋は GameView（CPU対局と同じcanvas＋エンジン）で動く。
// 受け方はエンジンなので応手は固定でない。よって「正解手順を最後まで辿る」のではなく、
// 「攻め方が初手を指す→受け方が応じて手数が進む」＝自由対局が機能することを検証する。

const VIEWPORT = { width: 414, height: 896 };
// セット1の第1問（3手詰の先頭。生成時に移動初手になるよう並べ替え済み）。
const firstProblem = (
  problemsData as { problems: { mateIn: number; moves: string[] }[] }
).problems.find((p) => p.mateIn === 3)!;

// USIマス表記 "1f" → { file:1, rank:6 }（段 a=1 … i=9）
function usiSquare(tok: string) {
  return { file: Number(tok[0]), rank: tok.charCodeAt(1) - 96 };
}

// GameView と同じレイアウトでマスのcanvas座標を求める。
async function squarePoint(page: Page, file: number, rank: number) {
  const vw = page.viewportSize()?.width ?? VIEWPORT.width;
  const vh = await page.evaluate(
    () => window.visualViewport?.height ?? window.innerHeight,
  );
  const layout = calcLayout(vw, vh);
  return fileRankToPixel(file, rank, false, layout.board, layout.cellSize);
}

test.describe("実践詰将棋モード", () => {
  test.use({ viewport: VIEWPORT });

  test("詰将棋ページが表示される", async ({ page }) => {
    await page.goto("/tsume");
    await expect(
      page.getByRole("heading", { name: "実践詰将棋" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "3手詰め" })).toBeVisible();
    await expect(page.getByRole("button", { name: "5手詰め" })).toBeVisible();
    // やねうらお氏へのクレジット
    await expect(page.getByText(/やねうらお/)).toBeVisible();
  });

  test("トップから詰将棋へ遷移できる", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /詰将棋に挑戦/ }).click();
    await expect(page).toHaveURL(/\/tsume$/);
    await expect(
      page.getByRole("heading", { name: "実践詰将棋" }),
    ).toBeVisible();
  });

  test("セットを開くとエンジン対局が始まる", async ({ page }) => {
    await page.goto("/tsume");
    await page.getByRole("button", { name: /1–10/ }).first().click();

    await expect(page.getByTestId("game-canvas")).toBeVisible();
    const status = page.getByTestId("game-status");
    await expect(status).toHaveAttribute("data-engine", "ready", {
      timeout: 30_000,
    });
    // 攻め方（先手）の手番から始まる
    await expect(status).toHaveAttribute("data-turn", "sente");
  });

  test("攻め方が指すと受け方（エンジン）が応じる", async ({ page }) => {
    await page.goto("/tsume");
    await page.getByRole("button", { name: /1–10/ }).first().click();

    const canvas = page.getByTestId("game-canvas");
    await expect(canvas).toBeVisible();
    const status = page.getByTestId("game-status");
    await expect(status).toHaveAttribute("data-engine", "ready", {
      timeout: 30_000,
    });

    const before = Number(await status.getAttribute("data-move-count"));

    // 第1問の正解初手（移動）を指す
    const usi = firstProblem.moves[0];
    const from = usiSquare(usi.slice(0, 2));
    const to = usiSquare(usi.slice(2, 4));
    const fp = await squarePoint(page, from.file, from.rank);
    const tp = await squarePoint(page, to.file, to.rank);
    await canvas.click({ position: { x: fp.x, y: fp.y } });
    await canvas.click({ position: { x: tp.x, y: tp.y } });

    // 攻め方の手＋受け方の応手で手数が進む（＝自由にエンジン対局できている）
    await expect(async () => {
      const now = Number(await status.getAttribute("data-move-count"));
      expect(now).toBeGreaterThan(before);
    }).toPass({ timeout: 20_000 });
  });

  test("5手詰めタブに切り替えられる", async ({ page }) => {
    await page.goto("/tsume");
    await page.getByRole("button", { name: "5手詰め" }).click();
    await page.getByRole("button", { name: /1–10/ }).first().click();
    await expect(page.getByTestId("game-canvas")).toBeVisible();
  });
});
