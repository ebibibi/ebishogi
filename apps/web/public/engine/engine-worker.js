importScripts("yaneuraou.k-p.js");

var engine = null;
var pending = [];

self.onmessage = function (e) {
  if (e.data.type === "command") {
    console.log("[engine-worker] CMD:", e.data.command);
    if (engine) {
      engine.postMessage(e.data.command);
    } else {
      pending.push(e.data.command);
    }
  }
};

console.log("[engine-worker] Fetching nn.bin...");
fetch("/engine/nn.bin")
  .then(function (res) {
    console.log("[engine-worker] nn.bin fetch status:", res.status);
    return res.arrayBuffer();
  })
  .then(function (evalBuf) {
    console.log("[engine-worker] nn.bin size:", evalBuf.byteLength);
    console.log("[engine-worker] Initializing YaneuraOu...");
    return YaneuraOu_K_P({
      locateFile: function (file) {
        return "/engine/" + file;
      },
      mainScriptUrlOrBlob: "/engine/yaneuraou.k-p.js",
      preRun: function (mod) {
        var data = new Uint8Array(evalBuf);
        var stream = mod.FS.open("/nn.bin", "w");
        mod.FS.write(stream, data, 0, data.byteLength, 0);
        mod.FS.close(stream);
        console.log("[engine-worker] nn.bin written to FS");
      },
    });
  })
  .then(function (mod) {
    console.log("[engine-worker] YaneuraOu initialized");
    engine = mod;
    mod.addMessageListener(function (line) {
      console.log("[engine-worker] OUT:", line);
      self.postMessage({ type: "engine-output", line: line });
    });
    mod.postMessage("setoption name EvalDir value .");
    mod.postMessage("setoption name EvalFile value nn.bin");
    for (var i = 0; i < pending.length; i++) {
      console.log("[engine-worker] Draining pending:", pending[i]);
      mod.postMessage(pending[i]);
    }
    pending = [];
    self.postMessage({ type: "ready" });
    console.log("[engine-worker] Ready sent");
  })
  .catch(function (err) {
    console.error("[engine-worker] ERROR:", err);
    self.postMessage({ type: "error", message: String(err) });
  });
