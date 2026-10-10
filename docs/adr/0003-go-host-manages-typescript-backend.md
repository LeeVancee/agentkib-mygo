# Let the Go host manage the TypeScript backend

Status: accepted

The MyGo desktop host will start, supervise, communicate with, and stop the existing `backend.cjs` process, then expose a compatibility adapter for the renderer's Desktop API. Keeping the backend as a separate process preserves its restart and crash isolation behavior while moving only the desktop shell to Go.
