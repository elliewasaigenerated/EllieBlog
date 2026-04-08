const runtime = {
  ready: false,
  initialized: false,
  error: null,
};

let readyResolve;
let readyReject;

const runtimeReady = new Promise((resolve, reject) => {
  readyResolve = resolve;
  readyReject = reject;
});

function postWorkerMessage(message) {
  self.postMessage(message);
}

self.Module = {
  locateFile(path, scriptDirectory) {
    if (path.endsWith(".wasm")) {
      return new URL(`../engine/${path}`, self.location.href).toString();
    }

    return new URL(path, scriptDirectory || self.location.href).toString();
  },
  onRuntimeInitialized() {
    runtime.ready = true;
    runtime.error = null;
    readyResolve();
    postWorkerMessage({ type: "runtime-ready" });
  },
  onAbort(error) {
    runtime.ready = false;
    runtime.error = error || "Engine aborted";
    readyReject(runtime.error);
    postWorkerMessage({ type: "runtime-error", error: String(runtime.error) });
  },
};

self.importScripts(new URL("../engine/cc0.js", self.location.href).toString());

async function ensureEngineInitialized() {
  await runtimeReady;

  if (runtime.initialized) return;

  await self.Module.ccall("init", "void", [], [], { async: true });
  await self.Module.ccall("new_game", "void", [], [], { async: true });
  runtime.initialized = true;
}

function normalizeMoveUci(moveUci) {
  if (typeof moveUci !== "string") return "";

  const trimmed = moveUci.trim().split(/\s+/).pop() || "";
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(trimmed) ? trimmed.toLowerCase() : "";
}

self.addEventListener("message", async (event) => {
  const { id, type, payload } = event.data || {};

  if (!id || !type) return;

  try {
    switch (type) {
      case "init": {
        await ensureEngineInitialized();
        postWorkerMessage({ id, type: "response", payload: { ok: true } });
        break;
      }
      case "reset": {
        await ensureEngineInitialized();
        await self.Module.ccall("new_game", "void", [], [], { async: true });
        postWorkerMessage({ id, type: "response", payload: { ok: true } });
        break;
      }
      case "evaluate": {
        await ensureEngineInitialized();
        const score = await self.Module.ccall(
          "evaluate_by_search",
          "number",
          ["string"],
          [payload.fen],
          { async: true }
        );
        postWorkerMessage({ id, type: "response", payload: { score } });
        break;
      }
      case "search": {
        await ensureEngineInitialized();
        const score = await self.Module.ccall(
          "evaluate_by_search",
          "number",
          ["string"],
          [payload.fen],
          { async: true }
        );
        const moveUci = await self.Module.ccall("best_move", "string", [], [], {
          async: true,
        });
        postWorkerMessage({
          id,
          type: "response",
          payload: {
            score,
            moveUci: normalizeMoveUci(moveUci),
          },
        });
        break;
      }
      default:
        throw new Error(`Unknown worker request type: ${type}`);
    }
  } catch (error) {
    runtime.error = error;
    postWorkerMessage({
      id,
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
