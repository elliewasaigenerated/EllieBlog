# Homura Cloudflare Pages Notes

This directory is the starting point for publishing Homura as a separate Cloudflare Pages app.

## Recommended deployment shape

- Deploy Homura as a static Pages site.
- Keep the WASM engine in the browser.
- Enable cross-origin isolation with the `_headers` file in this directory.
- Self-host every script, stylesheet, font, image, worker, and WASM file used by the app.

This is the viable free-tier path for a threaded browser build. Running a pthread-enabled WASM engine inside Cloudflare Workers is not the right target.

## Current blockers in `src/homura.html`

The current page is not ready for cross-origin isolation as-is because it still depends on third-party assets:

- `https://fonts.googleapis.com`
- `https://fonts.gstatic.com`
- `https://code.jquery.com/jquery-3.7.1.min.js`
- `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js`
- `https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.2/chess.js`

When `Cross-Origin-Embedder-Policy: require-corp` is enabled, these are the first resources likely to break unless they are replaced with same-origin copies or otherwise served with compatible CORS/CORP headers.

## Local assets already present in this repo

- `homura/cc0.js`
- `homura/cc0.wasm`
- `chess/css/chessboard-1.0.0.min.css`
- `chess/js/chessboard-1.0.0.min.js`
- `chess/img/chesspieces/wikipedia/*`

## Current scaffold status

The standalone Pages app now exists in:

- `homura-pages/index.html`
- `homura-pages/assets/css/style.css`
- `homura-pages/assets/css/homura.css`
- `homura-pages/assets/js/homura-engine-bootstrap.js`
- `homura-pages/assets/js/homura-app.js`
- `homura-pages/assets/engine/*`
- `homura-pages/assets/vendor/jquery/*`
- `homura-pages/assets/vendor/chessjs/*`
- `homura-pages/assets/vendor/chartjs/*`
- `homura-pages/assets/vendor/chessboard/*`

The app shell, engine files, local vendor libraries, chessboard assets, and isolation headers are in place. The playable runtime has been moved out of `src/homura.html` and into `homura-pages/assets/js/homura-app.js`.

## Code issues to fix before deployment

The current page also has runtime issues unrelated to Cloudflare:

- `sendUCICommand(...)` is called, but its implementation is commented out.
- `Module.ccall('_init', ...)` likely uses the wrong symbol name format for `ccall`.
- `evaluatePosition()` assigns `const value_ = ...` and then reads `_value[1]`.
- `bestMove()` ignores the current FEN.
- `isThreefoldRepetition()` mutates repetition state during status rendering.
- Player move gating is commented out in `onDragStart()`.

## Next implementation pass

To make this deployable as a separate Pages app, the next step should be:

1. Load the app from a local static server and confirm the engine boots correctly with the copied vendor files.
2. Deploy `homura-pages/` to Cloudflare Pages.
3. Verify `window.crossOriginIsolated === true` in the deployed app.
4. Decide whether to self-host fonts or accept the current fallback stack for the standalone app.
