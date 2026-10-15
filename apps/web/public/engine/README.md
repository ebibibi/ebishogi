# Browser shogi engine

CPU play, hints, analysis, and tsume defense use **TuyouraOu 11 mini**
(つようら王11mini), the larger of the mini/micro releases of 2026-10-14.

- Architecture: `SFNN_ka2_4096_8_64_progress8`
- Evaluation: `nn.bin` (7,711,372 bytes) and `progress.bin` (1,003,104 bytes)
- `FV_SCALE=24`, as specified by the publisher
- Publisher and evaluation author: YaneuraOu project
- Announcement: https://yaneuraou.yaneu.com/2026/10/14/tsuyou-11-mini-micro-released-under-mit-license/
- Distribution and MIT license grant: https://yaneurao.fanbox.cc/posts/12761272

The WASM runtime is YaneuraOu, **GPL-3.0**, built from
https://github.com/yaneurao/YaneuraOu/tree/c1b80eaa09fe13d5f12b1599d1ae4d53c224de30.
The evaluation files are **MIT**, independently of the runtime license;
see `tuyouraou11mini/LICENSE.txt`.

## Rebuilding

From the repository root, run `bash scripts/engine/build-mini.sh /absolute/path/to/empty/build-directory`.
Requires Git, curl, Python 3 with venv support, and Docker. The script pins the
source commit, the Emscripten 3.1.43 container digest used by upstream's WASM CI,
and the evaluation archive checksum. Newer Emscripten releases (5.x) build, but
search-thread output stalls until the next USI command, so `isready` and `go`
never answer in the browser.

`scripts/engine/browser.patch` reduces the upstream pthread pool from 32 to 4
and defaults to one search thread. It also lists the `print`, `printErr`,
`postRun`, and `locateFile` module hooks explicitly. The evaluator uses the
upstream WASM SIMD implementation. Both evaluation files are downloaded into the
virtual `/eval` filesystem before the worker announces readiness.

Evaluation SHA-256:

```text
45323c65135da65d6c2c364eea93a5af6a285c27ebfb07eab4afbe737ef74508  nn.bin
a2d18f0564639c945b5d6469e9b437cd64a526ad4fbcef02ab1d8f547d08e5f1  progress.bin
```

Browsers require WebAssembly SIMD, SharedArrayBuffer, and cross-origin isolation.
The existing `/engine/*` COEP/CORP headers cover the runtime and evaluation data.
No game positions are sent to a server.
