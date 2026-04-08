(() => {
  const runtime = (window.HomuraRuntime = window.HomuraRuntime || {
    ready: false,
    error: null,
  });

  const priorModule = window.Module || {};
  const priorLocateFile = priorModule.locateFile;
  const priorRuntimeInitialized = priorModule.onRuntimeInitialized;
  const priorAbort = priorModule.onAbort;

  window.Module = {
    ...priorModule,
    locateFile(path, scriptDirectory) {
      if (path.endsWith(".wasm")) {
        return `assets/engine/${path}`;
      }

      return typeof priorLocateFile === "function"
        ? priorLocateFile(path, scriptDirectory)
        : `${scriptDirectory}${path}`;
    },
    onRuntimeInitialized() {
      runtime.ready = true;
      runtime.error = null;
      document.dispatchEvent(new CustomEvent("homura:runtime-ready"));

      if (typeof priorRuntimeInitialized === "function") {
        priorRuntimeInitialized();
      }
    },
    onAbort(error) {
      runtime.ready = false;
      runtime.error = error || "Engine aborted";
      document.dispatchEvent(new CustomEvent("homura:runtime-error"));

      if (typeof priorAbort === "function") {
        priorAbort(error);
      }
    },
  };
})();
