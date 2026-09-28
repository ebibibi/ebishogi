import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { calcLayout, getActionButtons } from "../apps/web/src/lib/canvas/layout";

// 棋譜の保存・読込パネルはDOM、入口の「棋譜」ボタンはcanvas上にある。
// 読み込んだ結果は game-status の data-history-length / data-view-index で確かめる。
// 変換そのものの細かい検証は apps/web/src/lib/kifu.test.ts（node:test）が持つ。
const VIEWPORT = { width: 414, height: 896 };

// 角交換（成り・同・打ちを含む5手）
const USI = "position startpos moves 7g7f 3c3d 8h2b+ 3a2b B*4e";

async function openKifu(page: Page) {
  const vh = await page.evaluate(
    () => window.visualViewport?.height ?? window.innerHeight,
  );
  const btn = getActionButtons(calcLayout(VIEWPORT.width, vh)).find(
    (b) => b.action === "kifu",
  );
  if (!btn) throw new Error("kifu button not found");
  await page
    .getByTestId("game-canvas")
    .click({ position: { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 } });
  await expect(page.getByRole("heading", { name: "棋譜" })).toBeVisible();
}

async function pasteAndLoad(page: Page, text: string) {
  await page.getByLabel("棋譜テキスト").fill(text);
  await page.getByRole("button", { name: "貼り付けた棋譜を読み込む" }).click();
}

test.describe("棋譜の保存・読込", () => {
  test.use({ viewport: VIEWPORT });

  test("USIを貼り付けて読み込むと1手目から再生できる", async ({ page }) => {
    await page.goto("/game");
    await openKifu(page);
    await pasteAndLoad(page, USI);

    await expect(page.getByRole("heading", { name: "棋譜" })).toBeHidden();
    const status = page.getByTestId("game-status");
    await expect(status).toHaveAttribute("data-history-length", "6");
    await expect(status).toHaveAttribute("data-view-index", "0");
    await expect(status).toHaveAttribute("data-live", "0");
  });

  test("KIFをダウンロードし、そのファイルを読み込み直せる", async ({
    page,
  }) => {
    await page.goto("/game");
    await openKifu(page);
    await pasteAndLoad(page, USI);

    await openKifu(page);
    await expect(page.getByText("保存（5手）")).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "KIFをダウンロード" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^ebishogi_\d{8}_\d{4}\.kifu$/);
    const path = await download.path();
    const kif = await readFile(path, "utf-8");
    expect(kif).toContain("手合割：平手");
    expect(kif).toContain("   5 ４五角打");

    // 新しい対局で消してから、保存したファイルで復元する
    await page.getByRole("button", { name: "閉じる" }).click();
    const status = page.getByTestId("game-status");
    await openKifu(page);
    await pasteAndLoad(page, "startpos");
    await expect(status).toHaveAttribute("data-history-length", "1");

    await openKifu(page);
    await page.getByLabel("棋譜ファイル").setInputFiles(path);
    await expect(status).toHaveAttribute("data-history-length", "6");
  });

  test("読めない棋譜はエラーを表示し、対局はそのまま", async ({ page }) => {
    await page.goto("/game");
    await openKifu(page);
    await pasteAndLoad(page, "startpos moves 7g7f 7g7f");

    await expect(
      page.getByRole("dialog").getByRole("alert"),
    ).toContainText("2手目");
    await expect(page.getByTestId("game-status")).toHaveAttribute(
      "data-history-length",
      "1",
    );
  });

  test("対局は自動保存され、リロード後も続きから指せる", async ({ page }) => {
    await page.goto("/game");
    await openKifu(page);
    await pasteAndLoad(page, "startpos moves 7g7f 3c3d");

    await page.reload();
    const status = page.getByTestId("game-status");
    await expect(status).toHaveAttribute("data-history-length", "3");
    // 再開は最新局面（先手番）から
    await expect(status).toHaveAttribute("data-view-index", "2");
    await expect(status).toHaveAttribute("data-live", "1");
    await expect(status).toHaveAttribute("data-turn", "sente");
  });

  test("壊れた保存データは無視して平手から始める", async ({ page }) => {
    await page.goto("/game");
    await page.evaluate(() =>
      localStorage.setItem("ebishogi:lastGame", "{not json"),
    );
    await page.reload();
    await expect(page.getByTestId("game-status")).toHaveAttribute(
      "data-history-length",
      "1",
    );
  });
});
