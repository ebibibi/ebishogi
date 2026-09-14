import { test, expect, type Page } from "@playwright/test";
import { calcLayout, getActionButtons } from "../apps/web/src/lib/canvas/layout";

// 設定は localStorage に保存され、useSyncExternalStore 経由で読み出される。
// 「保存された値が初回描画から反映される」ことはリロードを挟まないと検証できない。
const VIEWPORT = { width: 414, height: 896 };

async function openSettings(page: Page) {
  const vh = await page.evaluate(
    () => window.visualViewport?.height ?? window.innerHeight,
  );
  const layout = calcLayout(VIEWPORT.width, vh);
  const btn = getActionButtons(layout).find((b) => b.action === "settings");
  if (!btn) throw new Error("settings button not found");
  await page
    .locator("canvas")
    .click({ position: { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 } });
  await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();
}

/** 「AIの推奨手」のトグル。ON のときだけ「表示タイミング」が出る。 */
function hintsToggle(page: Page) {
  return page
    .locator("section", { has: page.getByRole("heading", { name: "AIの推奨手" }) })
    .getByRole("button")
    .first();
}

test.describe("設定の永続化", () => {
  test.use({ viewport: VIEWPORT });

  test("変更はリロード後も残り、リセットで既定へ戻る", async ({ page }) => {
    await page.goto("/game");
    await openSettings(page);

    // 既定は ON
    await expect(page.getByText("表示タイミング")).toBeVisible();

    await hintsToggle(page).click();
    await expect(page.getByText("表示タイミング")).toBeHidden();
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("ebishogi-settings") ?? "{}"),
      ),
    ).toMatchObject({ showHints: false });

    // リロード後も OFF のまま（＝初回描画から保存値が効いている）
    await page.reload();
    await openSettings(page);
    await expect(page.getByText("表示タイミング")).toBeHidden();

    // リセットで既定へ戻り、保存も消える
    await page.getByRole("button", { name: "リセット" }).click();
    await expect(page.getByText("表示タイミング")).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("ebishogi-settings")),
    ).toBeNull();
  });
});
