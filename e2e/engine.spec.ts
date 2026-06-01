import { test, expect, type Page } from "@playwright/test";
import {
  calcLayout,
  fileRankToPixel,
  getActionButtons,
} from "../apps/web/src/lib/canvas/layout";

// CPU対局の盤面・持ち駒・手数・操作ボタンはすべて1枚の<canvas>に描画され、
// DOM要素として存在しない。そのため:
//   - マス／操作ボタンは calcLayout・fileRankToPixel・getActionButtons で
//     座標を算出し canvas.click({ position }) でピクセル指定クリックする
//     （座標をハードコードせずレイアウト式から導くため、レイアウト変更に強い）
//   - 盤面の状態は GameView が非表示DOM(data-testid="game-status")へミラー
//     するので、その data-* 属性を介して検証する
// DOM要素であるランディング・レベル選択・設定パネルは従来どおり role/text で検証。

const VIEWPORT = { width: 414, height: 896 };

// GameView と同じ実寸法でレイアウトを再現する。
// GameView は vh に visualViewport.height を使うため、ブラウザから実測して合わせる。
async function boardLayout(page: Page) {
  const vw = page.viewportSize()?.width ?? VIEWPORT.width;
  const vh = await page.evaluate(
    () => window.visualViewport?.height ?? window.innerHeight,
  );
  return calcLayout(vw, vh);
}

// 指定したマス(file, rank)のcanvas上の中心座標を返す（先手視点 = flipped:false）。
async function squarePoint(page: Page, file: number, rank: number) {
  const layout = await boardLayout(page);
  return fileRankToPixel(file, rank, false, layout.board, layout.cellSize);
}

// canvas下部の操作ボタン（新しい対局 / 設定 / トップへ）の中心座標を返す。
async function actionButtonPoint(page: Page, action: string) {
  const layout = await boardLayout(page);
  const btn = getActionButtons(layout).find((b) => b.action === action);
  if (!btn) throw new Error(`action button not found: ${action}`);
  return { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
}

test.describe("ebishogi CPU対局", () => {
  test.use({ viewport: VIEWPORT });

  test("ランディングページが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "ebishogi" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "対局を始める" }),
    ).toBeVisible();
    await expect(page.getByText("指しながら、強くなる")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /詰将棋に挑戦/ }),
    ).toBeVisible();
  });

  test("対局開始の導線（レベル選択経由でゲーム画面へ）", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "対局を始める" }).click();

    // レベル選択画面はDOM要素
    await expect(
      page.getByRole("heading", { name: "CPUの強さを選択" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "この強さで対局開始" }).click();

    // /game へ遷移し、canvas盤面が描画される
    await expect(page).toHaveURL(/\/game$/);
    await expect(page.getByTestId("game-canvas")).toBeVisible();
  });

  test("ゲーム画面でエンジンが初期化されエラーが出ない", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/game");
    await expect(page.getByTestId("game-canvas")).toBeVisible();

    const status = page.getByTestId("game-status");
    await expect(status).toHaveAttribute("data-engine", "ready", {
      timeout: 30_000,
    });

    const criticalErrors = errors.filter(
      (e) =>
        e.includes("createObjectURL") || e.includes("SharedArrayBuffer"),
    );
    expect(criticalErrors).toEqual([]);
  });

  test("エンジン解析で評価値が更新される", async ({ page }) => {
    await page.goto("/game");
    await expect(page.getByTestId("game-canvas")).toBeVisible();

    const status = page.getByTestId("game-status");
    await expect(status).toHaveAttribute("data-engine", "ready", {
      timeout: 30_000,
    });

    // 初期局面の解析が完了すると評価値(整数)がミラーされる
    await expect(async () => {
      const ev = await status.getAttribute("data-eval");
      expect(ev).toBeTruthy();
      expect(ev).toMatch(/^-?\d+$/);
    }).toPass({ timeout: 15_000 });
  });

  test("プレイヤーの着手後にCPUが応答する", async ({ page }) => {
    await page.goto("/game");
    const canvas = page.getByTestId("game-canvas");
    await expect(canvas).toBeVisible();

    const status = page.getByTestId("game-status");
    await expect(status).toHaveAttribute("data-engine", "ready", {
      timeout: 30_000,
    });

    const before = Number(await status.getAttribute("data-move-count"));

    // 7六歩（7七の歩を1つ前へ）: マスを選択 → 移動先をクリック
    const from = await squarePoint(page, 7, 7);
    const to = await squarePoint(page, 7, 6);
    await canvas.click({ position: { x: from.x, y: from.y } });
    await canvas.click({ position: { x: to.x, y: to.y } });

    // 自分の手 + CPUの応手で手数が2つ進む
    await expect(async () => {
      const now = Number(await status.getAttribute("data-move-count"));
      expect(now).toBeGreaterThanOrEqual(before + 2);
    }).toPass({ timeout: 25_000 });
  });

  test("設定パネルが開閉できる", async ({ page }) => {
    await page.goto("/game");
    const canvas = page.getByTestId("game-canvas");
    await expect(canvas).toBeVisible();

    // canvas上の「設定」ボタンを座標クリック
    const settings = await actionButtonPoint(page, "settings");
    await canvas.click({ position: settings });

    // 設定パネルはDOM要素
    await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();
    await expect(page.getByText("効果音")).toBeVisible();

    await page.getByRole("button", { name: "閉じる" }).click();
    await expect(page.getByRole("heading", { name: "設定" })).toBeHidden();
  });

  test("ゲーム画面からトップへ戻れる", async ({ page }) => {
    await page.goto("/game");
    const canvas = page.getByTestId("game-canvas");
    await expect(canvas).toBeVisible();

    // canvas上の「トップへ」ボタンを座標クリック
    const back = await actionButtonPoint(page, "back");
    await canvas.click({ position: back });

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("button", { name: "対局を始める" }),
    ).toBeVisible();
  });
});
