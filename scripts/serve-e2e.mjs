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
  let p = join(root, pathname);
  try {
    const s = await stat(p);
    if (s.isDirectory()) p = join(p, "index.html");
    await stat(p);
    return p;
  } catch {
    try {
      await stat(p + ".html");
      return p + ".html";
    } catch {
      return null;
    }
  }
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
