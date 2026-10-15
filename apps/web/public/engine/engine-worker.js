importScripts("yaneuraou.tuyouraou11mini.js");

var engine = null;
var pending = [];

self.onmessage = function (e) {
  if (e.data.type === "command") {
    if (engine) {
      engine.postMessage(e.data.command);
    } else {
      pending.push(e.data.command);
    }
  }
};

async function loadEvaluation(file) {
  const response = await fetch("/engine/tuyouraou11mini/" + file);
  if (!response.ok) {
    throw new Error(file + ": HTTP " + response.status);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function initialize() {
  let mod;
  try {
    // Fetch first so a download failure never leaves WASM pthreads running.
    const [nn, progress] = await Promise.all([
      loadEvaluation("nn.bin"),
      loadEvaluation("progress.bin"),
    ]);
    mod = await YaneuraOu_TuyouraOu11Mini({
      mainScriptUrlOrBlob: "/engine/yaneuraou.tuyouraou11mini.js",
      locateFile: function (file) {
        return "/engine/" + file;
      },
    });
    mod.FS.mkdir("/eval");
    mod.FS.writeFile("/eval/nn.bin", nn);
    mod.FS.writeFile("/eval/progress.bin", progress);
    engine = mod;
    mod.addMessageListener(function (line) {
      self.postMessage({ type: "engine-output", line: line });
    });
    mod.postMessage("setoption name EvalDir value /eval");
    mod.postMessage("setoption name FV_SCALE value 24");
    for (var i = 0; i < pending.length; i++) {
      mod.postMessage(pending[i]);
    }
    pending = [];
    self.postMessage({ type: "ready" });
  } catch (err) {
    mod?.terminate();
    console.error("[engine-worker] ERROR:", err);
    self.postMessage({ type: "error", message: String(err) });
  }
}

initialize();
