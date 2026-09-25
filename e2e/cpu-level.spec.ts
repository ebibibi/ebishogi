import { test, expect } from "@playwright/test";
import {
  CPU_LEVELS,
  describeCpuLevel,
  getCpuLevel,
  searchOptionsFor,
  TSUME_DEFENDER_SEARCH,
} from "../apps/web/src/lib/cpu-levels";

// 上位段階（三段・四段・最強）は探索時間で強さを変える。
// 以前は3段階とも同じ movetime 500 で、名前だけ違って強さは同じだった。
test.describe("CPUレベルの探索設定", () => {
  const byName = (name: string) => {
    const level = CPU_LEVELS.find((l) => l.name === name);
    if (!level) throw new Error(`level not found: ${name}`);
    return level;
  };

  test("上位3段階は探索時間が段階的に長くなる", () => {
    expect(searchOptionsFor(byName("三段"))).toEqual({ multiPV: 1, timeMs: 500 });
    expect(searchOptionsFor(byName("四段"))).toEqual({ multiPV: 1, timeMs: 1500 });
    expect(searchOptionsFor(byName("最強"))).toEqual({ multiPV: 1, timeMs: 3000 });
  });

  test("深さ指定の段階は深さと候補手数をそのまま渡す", () => {
    expect(searchOptionsFor(byName("10級"))).toEqual({ multiPV: 3, depth: 1 });
    expect(searchOptionsFor(byName("二段"))).toEqual({ multiPV: 1, depth: 12 });
  });

  test("探索時間で決まる段階はすべて異なる設定になる", () => {
    const timeLevels = CPU_LEVELS.filter((l) => l.search.kind === "time");
    const times = timeLevels.map((l) => searchOptionsFor(l));
    expect(new Set(times.map((t) => JSON.stringify(t))).size).toBe(timeLevels.length);
  });

  test("詰将棋の受け方は最強とは独立した0.5秒固定", () => {
    expect(TSUME_DEFENDER_SEARCH).toEqual({ multiPV: 1, timeMs: 500 });
    expect(searchOptionsFor(byName("最強"))).not.toEqual(TSUME_DEFENDER_SEARCH);
  });

  test("範囲外のレベル番号は最強として扱う", () => {
    expect(getCpuLevel(99).name).toBe("最強");
    expect(getCpuLevel(-1).name).toBe("最強");
  });

  test("探索時間で決まる段階だけ思考時間を説明に添える", () => {
    expect(describeCpuLevel(byName("最強"))).toBe("容赦なし（思考3秒）");
    expect(describeCpuLevel(byName("四段"))).toBe("アマ強豪クラス（思考1.5秒）");
    expect(describeCpuLevel(byName("初段"))).toBe("本格的な将棋");
  });
});

test("レベル選択画面に上位段階の思考時間が表示される", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "対局を始める" }).click();
  await expect(page.getByRole("heading", { name: "CPUの強さを選択" })).toBeVisible();

  // 既定は最強
  await expect(page.getByText("容赦なし（思考3秒）")).toBeVisible();

  await page.getByRole("slider").fill(String(CPU_LEVELS.length - 2));
  await expect(page.getByText("アマ強豪クラス（思考1.5秒）")).toBeVisible();

  await page.getByRole("slider").fill("0");
  await expect(page.getByText("ゆるく遊べる", { exact: true })).toBeVisible();
});
