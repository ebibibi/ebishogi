import { test, expect } from "@playwright/test";
import fixture from "./tsume-fixture.json";

test.describe("詰将棋モード", () => {
  test("詰将棋ページが表示される", async ({ page }) => {
    await page.goto("/tsume");
    await expect(page.getByRole("heading", { name: "詰将棋" })).toBeVisible();
    await expect(page.getByRole("button", { name: "3手詰め" })).toBeVisible();
    await expect(page.getByRole("button", { name: "5手詰め" })).toBeVisible();
  });

  test("トップから詰将棋へ遷移できる", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /詰将棋に挑戦/ }).click();
    await expect(page).toHaveURL(/\/tsume$/);
    await expect(page.getByRole("heading", { name: "詰将棋" })).toBeVisible();
  });

  test("問題を開くと盤面が描画され、ヒントが段階表示される", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.goto("/tsume");
    await page.getByRole("button", { name: "1", exact: true }).click();

    await expect(page.getByText(/第1問/)).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByText(/残り3手/)).toBeVisible();

    // 1段階目のヒント
    await page.getByRole("button", { name: "ヒント" }).click();
    await expect(page.getByText(/を使います/)).toBeVisible();
    // 2段階目（もっとヒント）
    await page.getByRole("button", { name: "もっとヒント" }).click();
    await expect(page.getByText(/がねらい目/)).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("5手詰めタブに切り替えられる", async ({ page }) => {
    await page.goto("/tsume");
    await page.getByRole("button", { name: "5手詰め" }).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await expect(page.getByText(/残り5手/)).toBeVisible();
  });

  test("詰将棋を解いてクリアできる", async ({ page }) => {
    // フィクスチャ(e2e/tsume-fixture.json)は scripts/build-tsume-problems.mts が
    // problems.json から生成する。攻め方の正解手のクリック座標を持つ。
    // viewport 1280x720 では TsumeBoard が cell=44 のレイアウトを使うため、
    // フィクスチャの座標がそのまま盤面のマス・持ち駒に対応する。
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/tsume");
    await page.getByRole("button", { name: `${fixture.mateIn}手詰め` }).click();
    await page
      .getByRole("button", { name: String(fixture.problemNumber), exact: true })
      .click();

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    const status = page.getByTestId("tsume-status");
    await expect(status).toHaveAttribute(
      "data-remaining",
      String(fixture.mateIn),
    );

    // 攻め方の正解手を順にクリック（受け方の応手は自動で指される）
    for (const c of fixture.clicks) {
      await canvas.click({ position: { x: c.x, y: c.y } });
    }

    await expect(status).toHaveAttribute("data-solved", "1");
    await expect(page.getByText(/詰みました/)).toBeVisible();
  });
});
