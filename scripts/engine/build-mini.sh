#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
build_dir=${1:?Usage: build-mini.sh /absolute/path/to/empty/build-directory}
[[ "$build_dir" = /* ]] || { echo "Build directory must be absolute" >&2; exit 1; }
mkdir -p "$build_dir"
git clone https://github.com/yaneurao/YaneuraOu.git "$build_dir/YaneuraOu"
git -C "$build_dir/YaneuraOu" checkout c1b80eaa09fe13d5f12b1599d1ae4d53c224de30
git -C "$build_dir/YaneuraOu" apply "$repo_dir/scripts/engine/browser.patch"
curl -fLsS 'https://storage.yaneu.com/yaneuraou/TuyouraOu11mini-SFNN_ka2_4096_8_64_progress8-epoch0010-20261003.7z' -o "$build_dir/mini.7z"
printf '%s  %s\n' bd5cd719e000ee3e8c4f158ecd7b56913655569fa73911bd95209f55bbb772ea "$build_dir/mini.7z" | sha256sum -c -
python3 -m venv "$build_dir/venv"
"$build_dir/venv/bin/pip" install py7zr==1.1.4
"$build_dir/venv/bin/py7zr" x "$build_dir/mini.7z" "$build_dir/eval"
docker run --rm -v "$build_dir/YaneuraOu:/src" -w /src/source \
  emscripten/emsdk@sha256:e856cd59d54fd143366c2df314043d63a1ca23ab43521e0f30f9d9a7ce6d43e0 \
  python3 eval/nnue/architectures/nnue_arch_gen.py SFNN_ka2_4096_8_64_progress8 eval/nnue/architectures
docker run --rm -v "$build_dir/YaneuraOu:/src" -w /src/source \
  emscripten/emsdk@sha256:e856cd59d54fd143366c2df314043d63a1ca23ab43521e0f30f9d9a7ce6d43e0 \
  make -j4 /src/yaneuraou.tuyouraou11mini.js COMPILER=em++ TARGET_CPU=WASM \
  YANEURAOU_EDITION=YANEURAOU_ENGINE_SFNN_ka2_4096_8_64_progress8 \
  TARGET=/src/yaneuraou.tuyouraou11mini.js EM_EXPORT_NAME=YaneuraOu_TuyouraOu11Mini \
  EM_INITIAL_MEMORY_SIZE=138412032
cp "$build_dir/YaneuraOu/yaneuraou.tuyouraou11mini.js" "$build_dir/YaneuraOu/yaneuraou.tuyouraou11mini.worker.js" \
  "$build_dir/YaneuraOu/yaneuraou.tuyouraou11mini.wasm" "$repo_dir/apps/web/public/engine/"
cp "$build_dir/eval/nn.bin" "$build_dir/eval/progress.bin" "$build_dir/eval/eval_options.txt" "$build_dir/eval/tag.json" "$repo_dir/apps/web/public/engine/tuyouraou11mini/"
