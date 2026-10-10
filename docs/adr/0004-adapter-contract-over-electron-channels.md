# Preserve the adapter contract, not Electron channels

Status: accepted

The migration will preserve the renderer's `DesktopApi` methods, return values, errors, and events, while allowing the MyGo transport to use its own request and event protocol. Electron IPC channel names are implementation details and will not become part of the new host contract.
