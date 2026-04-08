(() => {
  const playerColor = "w";
  const boardEl = document.getElementById("board");
  const runtimeStatusEl = document.getElementById("runtimeStatus");
  const engineNoteEl = document.getElementById("engineNote");
  const turnStatusEl = document.getElementById("turnStatus");
  const gameStatusEl = document.getElementById("gameStatus");
  const fenStatusEl = document.getElementById("fenStatus");
  const movesEl = document.getElementById("moves");
  const resetBtn = document.getElementById("resetBtn");
  const undoBtn = document.getElementById("undoBtn");
  const pageStateEl = document.getElementById("pageState");

  const missing = [];

  if (typeof window.jQuery === "undefined") missing.push("jquery");
  if (typeof window.Chess === "undefined") missing.push("chess.js");
  if (typeof window.Chart === "undefined") missing.push("chart.js");
  if (typeof window.Chessboard === "undefined") missing.push("chessboard.js");

  if (missing.length > 0) {
    runtimeStatusEl.textContent = `Missing local dependencies: ${missing.join(", ")}`;
    pageStateEl.textContent = "Runtime blocked";
    gameStatusEl.textContent = "Missing local dependencies";
    boardEl.classList.add("board-placeholder");
    boardEl.textContent =
      "This standalone app is wired for same-origin deployment, but one or more local vendor libraries failed to load.";
    return;
  }

  const runtime = { ready: false, error: null };
  const game = new window.Chess();
  let board = null;
  let evalHistory = [];
  let engineBusy = false;
  let engineInitialized = false;
  let hasEngineEval = false;
  let pendingAfterMove = false;
  let workerRequestId = 0;
  let engineWorker = null;
  let selectedSquare = null;
  let lastMoveSquares = null;
  let lastTouchInteractionAt = 0;
  const workerRequests = new Map();

  const evalChart = new window.Chart(document.getElementById("evalChart"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Eval",
          data: [],
          fill: true,
          tension: 0.28,
          borderWidth: 2,
          pointRadius: 0,
          borderColor: "#c7631b",
          backgroundColor: "rgba(199, 99, 27, 0.18)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "#c9b8a5" },
        },
        y: {
          suggestedMin: -5,
          suggestedMax: 5,
          grid: { color: "rgba(255,255,255,0.08)" },
          ticks: { color: "#c9b8a5" },
        },
      },
    },
  });

  function moduleReady() {
    return runtime.ready && engineWorker !== null;
  }

  function hasThreefoldRepetition() {
    return typeof game.in_threefold_repetition === "function"
      ? game.in_threefold_repetition()
      : false;
  }

  function currentPageState() {
    if (runtime.error) return "Engine error";
    if (!moduleReady()) return "Engine loading";
    return game.game_over() ? "Game finished" : "Game in progress";
  }

  function gameStatusText() {
    if (game.in_checkmate()) {
      return game.turn() === "w" ? "Checkmate, black wins" : "Checkmate, white wins";
    }
    if (game.in_stalemate()) return "Draw by stalemate";
    if (hasThreefoldRepetition()) return "Draw by repetition";
    if (game.insufficient_material()) return "Draw by insufficient material";
    if (game.in_draw()) return "Draw";
    if (engineBusy) return "Homura is thinking...";
    return game.turn() === playerColor ? "Your move" : "Waiting for Homura move";
  }

  function turnText() {
    return game.turn() === "w" ? "White to move" : "Black to move";
  }

  function setRuntimeStatus() {
    if (runtime.error) {
      runtimeStatusEl.textContent = "Engine failed to initialize";
      engineNoteEl.textContent =
        "The local WASM runtime aborted during startup. Check the browser console for the underlying error.";
      return;
    }

    if (!moduleReady()) {
      runtimeStatusEl.textContent = "Loading WASM engine";
      return;
    }

    runtimeStatusEl.textContent = engineInitialized ? "WASM engine ready" : "Initializing engine";
  }

  function updateMoves() {
    const history = game.history();
    if (!history.length) {
      movesEl.textContent = "No moves yet.";
      return;
    }

    const rows = [];
    for (let i = 0; i < history.length; i += 2) {
      const moveNo = Math.floor(i / 2) + 1;
      const whiteMove = history[i] || "";
      const blackMove = history[i + 1] || "";
      rows.push(`${moveNo}. ${whiteMove} ${blackMove}`.trim());
    }

    movesEl.textContent = rows.join("\n");
  }

  function updateStatus() {
    pageStateEl.textContent = currentPageState();
    turnStatusEl.textContent = turnText();
    gameStatusEl.textContent = gameStatusText();
    fenStatusEl.textContent = game.fen();
    resetBtn.classList.toggle("hidden", !game.game_over());
    undoBtn.disabled = engineBusy || game.history().length === 0;
    setRuntimeStatus();
    updateMoves();
  }

  function clearSquareHighlights() {
    if (!boardEl) return;
    for (const squareEl of boardEl.querySelectorAll(".square-55d63")) {
      squareEl.classList.remove("square-selected", "square-lastmove");
    }
  }

  function applySquareHighlights() {
    clearSquareHighlights();

    if (selectedSquare) {
      const selectedEl = boardEl.querySelector(`[data-square="${selectedSquare}"]`);
      if (selectedEl) {
        selectedEl.classList.add("square-selected");
      }
    }

    if (!lastMoveSquares) return;

    for (const square of [lastMoveSquares.from, lastMoveSquares.to]) {
      if (!square) continue;
      const squareEl = boardEl.querySelector(`[data-square="${square}"]`);
      if (squareEl) {
        squareEl.classList.add("square-lastmove");
      }
    }
  }

  function syncBoard() {
    if (board) {
      board.position(game.fen(), false);
    }
    applySquareHighlights();
    updateStatus();
  }

  function setLastMove(move) {
    if (!move || !move.from || !move.to) {
      lastMoveSquares = null;
      return;
    }

    lastMoveSquares = { from: move.from, to: move.to };
  }

  function syncLastMoveFromHistory() {
    const history = game.history({ verbose: true });
    const move = history[history.length - 1] || null;
    setLastMove(move);
  }

  function resetEvalChart() {
    evalHistory = [];
    evalChart.data.labels = [];
    evalChart.data.datasets[0].data = [];
    evalChart.update();
  }

  function pushEval(score) {
    evalHistory.push(score);
    evalChart.data.labels = evalHistory.map((_, index) => index);
    evalChart.data.datasets[0].data = evalHistory;
    evalChart.update();
  }

  function waitForPaint() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(resolve);
      });
    });
  }

  function fallbackMaterialEval() {
    const material = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 0 };
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    let score = 0;

    for (let rank = 1; rank <= 8; rank += 1) {
      for (const file of files) {
        const piece = game.get(`${file}${rank}`);
        if (!piece) continue;

        const value = material[piece.type] || 0;
        score += piece.color === "w" ? value : -value;
      }
    }

    return score;
  }

  function handleWorkerMessage(event) {
    const message = event.data || {};

    if (message.type === "runtime-ready") {
      runtime.ready = true;
      runtime.error = null;
      setRuntimeStatus();
      updateStatus();
      if (!hasEngineEval) {
        resetEvalChart();
        void evaluatePosition();
      }
      return;
    }

    if (message.type === "runtime-error") {
      runtime.ready = false;
      runtime.error = message.error || "Engine aborted";
      setRuntimeStatus();
      updateStatus();
      return;
    }

    const pending = workerRequests.get(message.id);
    if (!pending) return;

    workerRequests.delete(message.id);

    if (message.type === "response") {
      pending.resolve(message.payload);
      return;
    }

    pending.reject(new Error(message.error || "Engine worker request failed"));
  }

  function createEngineWorker() {
    const worker = new Worker("assets/js/homura-engine-worker.js");
    worker.addEventListener("message", handleWorkerMessage);
    worker.addEventListener("error", (event) => {
      runtime.ready = false;
      runtime.error = event.message || "Engine worker crashed";
      setRuntimeStatus();
      updateStatus();
    });
    return worker;
  }

  function callWorker(type, payload = {}) {
    if (!engineWorker) {
      return Promise.reject(new Error("Engine worker is unavailable"));
    }

    const id = `worker-${++workerRequestId}`;

    return new Promise((resolve, reject) => {
      workerRequests.set(id, { resolve, reject });
      engineWorker.postMessage({ id, type, payload });
    });
  }

  const engineBridge = {
    async init() {
      if (!engineWorker) {
        engineWorker = createEngineWorker();
      }

      await callWorker("init");
      engineInitialized = true;
      setRuntimeStatus();
    },
    async reset() {
      await this.init();
      await callWorker("reset");
    },
    async evaluate(fen) {
      await this.init();
      const result = await callWorker("evaluate", { fen });
      return result.score;
    },
    async searchPosition(fen) {
      await this.init();
      return callWorker("search", { fen });
    },
  };

  async function evaluatePosition() {
    try {
      if (moduleReady()) {
        const score = await engineBridge.evaluate(game.fen());
        hasEngineEval = true;
        pushEval(Number.isFinite(score) ? -( score / 100 ) : 0);
        return;
      }
    } catch (error) {
      runtime.error = error;
      console.error("Engine evaluate failed:", error);
    }

    hasEngineEval = false;
    pushEval(fallbackMaterialEval());
  }

  async function requestEngineMove() {
    if (game.game_over() || game.turn() === playerColor) return;

    engineBusy = true;
    updateStatus();

    try {
      let moveUci = "";
      let score = null;

      if (moduleReady()) {
        const result = await engineBridge.searchPosition(game.fen());
        moveUci = result.moveUci;
        score = -result.score;
      }

      if (!moveUci) {
        const legalMoves = game.moves({ verbose: true });
        const firstLegalMove = legalMoves[0];
        moveUci = firstLegalMove
          ? `${firstLegalMove.from}${firstLegalMove.to}${firstLegalMove.promotion || ""}`
          : "";
      }

      if (!moveUci) return;

      const move = game.move({
        from: moveUci.slice(0, 2),
        to: moveUci.slice(2, 4),
        promotion: moveUci.slice(4, 5) || "q",
      });

      if (move) {
        selectedSquare = null;
        setLastMove(move);
        if (Number.isFinite(score)) {
          hasEngineEval = true;
          pushEval(score / 100);
        } else {
          await evaluatePosition();
        }
      }
    } catch (error) {
      runtime.error = error;
      console.error("Engine move failed:", error);
    } finally {
      engineBusy = false;
      syncBoard();
    }
  }

  async function afterMove() {
    syncBoard();
    await waitForPaint();
    if (!game.game_over() && game.turn() !== playerColor) {
      await requestEngineMove();
    } else if (!game.game_over()) {
      await evaluatePosition();
    } else {
      await evaluatePosition();
      updateStatus();
    }
  }

  async function resetGame() {
    game.reset();
    resetEvalChart();
    selectedSquare = null;
    lastMoveSquares = null;

    try {
      if (moduleReady()) {
        await engineBridge.reset();
      }
    } catch (error) {
      runtime.error = error;
      console.error("Engine reset failed:", error);
    }

    syncBoard();
    await evaluatePosition();
  }

  async function undoLastPly() {
    if (engineBusy || !game.history().length) return;

    game.undo();
    if (game.history().length) {
      game.undo();
    }

    selectedSquare = null;
    syncLastMoveFromHistory();
    resetEvalChart();
    syncBoard();
    await evaluatePosition();
  }

  function onDragStart(source, piece) {
    if (engineBusy || game.game_over()) return false;
    if (game.turn() !== playerColor) return false;
    if (piece.startsWith("b")) return false;
    selectedSquare = source;
    applySquareHighlights();
    return true;
  }

  function onDrop(source, target) {
    const move = game.move({
      from: source,
      to: target,
      promotion: "q",
    });

    if (!move) return "snapback";
    selectedSquare = null;
    setLastMove(move);
    pendingAfterMove = true;
    return undefined;
  }

  function tryPlayerMove(source, target) {
    const move = game.move({
      from: source,
      to: target,
      promotion: "q",
    });

    if (!move) return false;

    selectedSquare = null;
    setLastMove(move);
    void afterMove();
    return true;
  }

  function handleSquareSelection(square) {
    if (engineBusy || game.game_over()) return;
    if (game.turn() !== playerColor) return;

    const piece = game.get(square);

    if (!selectedSquare) {
      if (piece && piece.color === playerColor) {
        selectedSquare = square;
        applySquareHighlights();
      }
      return;
    }

    if (selectedSquare === square) {
      selectedSquare = null;
      applySquareHighlights();
      return;
    }

    if (piece && piece.color === playerColor) {
      selectedSquare = square;
      applySquareHighlights();
      return;
    }

    if (!tryPlayerMove(selectedSquare, square)) {
      applySquareHighlights();
    }
  }

  function findSquareFromEventTarget(target) {
    if (!(target instanceof Element)) return null;
    return target.closest("[data-square]");
  }

  function onBoardClick(event) {
    if (Date.now() - lastTouchInteractionAt < 500) return;
    const squareEl = findSquareFromEventTarget(event.target);
    if (!squareEl) return;
    handleSquareSelection(squareEl.getAttribute("data-square"));
  }

  function onBoardTouchStart(event) {
    const squareEl = findSquareFromEventTarget(event.target);
    if (!squareEl) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onBoardTouchEnd(event) {
    const squareEl = findSquareFromEventTarget(event.target);
    if (!squareEl) return;
    lastTouchInteractionAt = Date.now();
    event.preventDefault();
    event.stopPropagation();
    handleSquareSelection(squareEl.getAttribute("data-square"));
  }

  function onSnapEnd() {
    if (!pendingAfterMove) {
      syncBoard();
      return;
    }

    updateStatus();
    pendingAfterMove = false;
    void afterMove();
  }

  board = window.Chessboard("board", {
    draggable: true,
    position: "start",
    orientation: "white",
    pieceTheme: "assets/vendor/chessboard/img/chesspieces/wikipedia/{piece}.png",
    onDragStart,
    onDrop,
    onSnapEnd,
  });

  resetBtn.addEventListener("click", resetGame);
  undoBtn.addEventListener("click", () => {
    void undoLastPly();
  });
  boardEl.addEventListener("click", onBoardClick);
  boardEl.addEventListener("touchstart", onBoardTouchStart, { capture: true, passive: false });
  boardEl.addEventListener("touchend", onBoardTouchEnd, { capture: true, passive: false });

  syncBoard();
  engineWorker = createEngineWorker();
  void evaluatePosition();
})();
