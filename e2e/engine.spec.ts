import { test, expect } from "@playwright/test";

test.describe("ebishogi", () => {
  test("landing page loads correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "ebishogi" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "対局を始める" }),
    ).toBeVisible();
    await expect(page.getByText("指しながら、強くなる")).toBeVisible();
  });

  test("game starts and engine initializes without errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.getByRole("button", { name: "対局を始める" }).click();

    await expect(page.getByText("先手の番")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("AIエンジン読込中...")).toBeHidden({
      timeout: 30_000,
    });

    const criticalErrors = consoleErrors.filter(
      (e) =>
        e.includes("createObjectURL") || e.includes("SharedArrayBuffer"),
    );
    expect(criticalErrors).toEqual([]);
  });

  test("board is rendered with pieces", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "対局を始める" }).click();

    await expect(page.getByText("手数:")).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole("button", { name: "新しい対局" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "トップへ" }),
    ).toBeVisible();
  });

  test("can return to landing page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "対局を始める" }).click();
    await expect(page.getByText("先手の番")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "トップへ" }).click();
    await expect(
      page.getByRole("button", { name: "対局を始める" }),
    ).toBeVisible();
  });
});
