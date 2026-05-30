importScripts("yaneuraou.k-p.js");

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

YaneuraOu_K_P({
  locateFile: function (file) {
    return "/engine/" + file;
  },
})
  .then(function (mod) {
    engine = mod;
    mod.addMessageListener(function (line) {
      self.postMessage({ type: "engine-output", line: line });
    });
    for (var i = 0; i < pending.length; i++) {
      mod.postMessage(pending[i]);
    }
    pending = [];
    self.postMessage({ type: "ready" });
  })
  .catch(function (err) {
    console.error("[engine-worker] ERROR:", err);
    self.postMessage({ type: "error", message: String(err) });
  });
