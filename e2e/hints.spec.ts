import { test, expect } from "@playwright/test";

// AIの推奨手は「3番手→2番手→1番手」の順に時間差で盤上へ現れる。
// 実際の既定値は30〜60秒なので、設定を先に localStorage へ書いてから開く。
const VIEWPORT = { width: 414, height: 896 };

test.describe("AI推奨手の段階表示", () => {
  test.use({ viewport: VIEWPORT });

  test("設定した遅延のあと矢印が現れる", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "ebishogi-settings",
        JSON.stringify({
          arrowDelay3rd: 1,
          arrowDelay2nd: 1,
          arrowDelay1st: 1,
          showHints: true,
        }),
      );
    });
    await page.goto("/game");

    const status = page.getByTestId("game-status");
    await expect(status).toHaveAttribute("data-engine", "ready", {
      timeout: 30_000,
    });

    // 開いた直後は矢印なし
    await expect(status).toHaveAttribute("data-arrows", "0");

    // 遅延後に現れる
    await expect
      .poll(() => status.getAttribute("data-arrows"), { timeout: 20_000 })
      .not.toBe("0");
  });

  test("ヒントを切っていれば矢印は出ない", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "ebishogi-settings",
        JSON.stringify({
          arrowDelay3rd: 1,
          arrowDelay2nd: 1,
          arrowDelay1st: 1,
          showHints: false,
        }),
      );
    });
    await page.goto("/game");

    const status = page.getByTestId("game-status");
    await expect(status).toHaveAttribute("data-engine", "ready", {
      timeout: 30_000,
    });
    await page.waitForTimeout(4000);
    await expect(status).toHaveAttribute("data-arrows", "0");
  });
});
