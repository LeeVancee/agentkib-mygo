# Use stdio JSON-RPC for the MyGo backend process

Status: accepted

The MyGo host will launch `backend.cjs` and communicate over its existing framed stdin/stdout JSON-RPC transport. Electron's utility-process MessageChannel remains only in the temporary fallback build; the MyGo path will not open a local network port for backend IPC.
