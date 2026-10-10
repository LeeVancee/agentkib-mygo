# Preserve the renderer Desktop API

Status: accepted

The migration will keep the existing renderer-facing `DesktopApi` contract and replace its Electron IPC implementation with a MyGo adapter. This keeps React product logic stable while the host changes, and confines the migration's compatibility risk to one boundary; regenerating every renderer call around MyGo bindings was considered but would couple the product UI to the new shell prematurely.
