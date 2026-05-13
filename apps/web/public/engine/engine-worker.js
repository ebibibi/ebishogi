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
  mainScriptUrlOrBlob: "/engine/yaneuraou.k-p.js",
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
    self.postMessage({ type: "error", message: String(err) });
  });
