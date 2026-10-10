# Keep window and backend startup parallel

Status: accepted

The MyGo host will show the main window without waiting for the TypeScript backend handshake, while starting the backend and Web/LAN services in parallel. Existing runtime status events remain the readiness signal for the renderer, preserving the current startup behavior and allowing startup improvements to be measured.
