import { test, expect } from "@playwright/test";

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

  test("駒を動かして3手詰めをクリアできる", async ({ page }) => {
    // viewport を固定すると calcTsumeLayout が cell=44px を返すため、
    // 各マス・持ち駒スロットのキャンバス座標を逆算できる。
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/tsume");
    await page.getByRole("button", { name: "1", exact: true }).click();
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // 初手 ８三金打: 持ち駒の金 → 8三
    await canvas.click({ position: { x: 24, y: 456 } });
    await canvas.click({ position: { x: 66, y: 148 } });
    await expect(page.getByText(/いい手です/)).toBeVisible();

    // 受け方の応手は自動。詰め上げの ７二金打: 持ち駒の金 → 7二
    await canvas.click({ position: { x: 24, y: 456 } });
    await canvas.click({ position: { x: 110, y: 104 } });
    await expect(page.getByText(/詰みました/)).toBeVisible();
    await expect(page.getByText(/クリア！/)).toBeVisible();
  });
});
