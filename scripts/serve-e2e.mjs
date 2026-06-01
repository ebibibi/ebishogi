import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const root = join(process.cwd(), "apps/web/out");
const port = Number(process.env.PORT) || 4173;

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain",
};

async function resolveFile(pathname) {
  // Next.js の static export は /tsume → tsume.html 形式で出力するため、
  // 実ファイル → {route}.html → ディレクトリ/index.html の順に解決する。
  const base = join(root, pathname);
  const candidates = [base];
  if (!extname(base)) {
    candidates.push(base + ".html");
    candidates.push(join(base, "index.html"));
  }
  for (const candidate of candidates) {
    try {
      const s = await stat(candidate);
      if (s.isFile()) return candidate;
    } catch {
      /* 次の候補へ */
    }
  }
  return null;
}

createServer(async (req, res) => {
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

  const pathname = new URL(req.url, "http://localhost").pathname;
  const filePath = await resolveFile(pathname);
  if (!filePath) {
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }

  const content = await readFile(filePath);
  res.setHeader(
    "Content-Type",
    mimeTypes[extname(filePath)] || "application/octet-stream",
  );
  res.end(content);
}).listen(port, () => {
  console.log(`E2E server running on http://localhost:${port}`);
});
