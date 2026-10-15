import { test, expect } from "@playwright/test";

test("mini evaluation loads both files and returns MultiPV best moves", async ({ page }) => {
  await page.goto("/game");
  const lines = await page.evaluate(() => new Promise<string[]>((resolve, reject) => {
    const worker = new Worker("/engine/engine-worker.js");
    const output: string[] = [];
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(output.join("\n")));
    }, 45_000);
    worker.onmessage = ({ data }) => {
      if (data.type === "error") {
        clearTimeout(timer);
        worker.terminate();
        reject(new Error(data.message));
      }
      if (data.type === "ready") worker.postMessage({ type: "command", command: "usi" });
      if (data.type !== "engine-output") return;
      output.push(data.line);
      const send = (command: string) => worker.postMessage({ type: "command", command });
      if (data.line === "usiok") {
        send("setoption name Threads value 1");
        send("setoption name USI_Hash value 16");
        send("setoption name BookFile value no_book");
        send("isready");
      }
      if (data.line === "readyok") {
        send("setoption name MultiPV value 3");
        send("position startpos");
        send("go depth 3");
      }
      if (data.line.startsWith("bestmove ")) {
        clearTimeout(timer);
        worker.terminate();
        resolve(output);
      }
    };
  }));
  expect(lines.join("\n")).toContain("loading eval file : /eval/nn.bin");
  expect(lines.join("\n")).toContain("loading progress file : /eval/progress.bin");
  expect(lines.join("\n")).not.toMatch(/mismatch|failed|FileNotFound/i);
  expect(lines.join("\n")).toMatch(/FV_SCALE type spin/);
  for (const rank of [1, 2, 3]) {
    expect(lines.some((line) => line.includes(`multipv ${rank} `) && line.includes("score cp"))).toBe(true);
  }
  expect(lines.at(-1)).toMatch(/^bestmove [1-9][a-i][1-9][a-i]/);
});

test("missing progress download reports an initialization error", async ({ page }) => {
  await page.route("**/engine/tuyouraou11mini/progress.bin", (route) => route.fulfill({ status: 404, body: "missing" }));
  await page.goto("/game");
  const message = await page.evaluate(() => new Promise<string>((resolve, reject) => {
    const worker = new Worker("/engine/engine-worker.js");
    const timer = setTimeout(() => { worker.terminate(); reject(new Error("No load error")); }, 30_000);
    worker.onmessage = ({ data }) => {
      if (data.type === "error" || data.type === "ready") {
        clearTimeout(timer);
        worker.terminate();
        resolve(data.type === "error" ? data.message : "unexpected ready");
      }
    };
  }));
  expect(message).toMatch(/progress.bin.*404/);
});
