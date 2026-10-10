# Keep the MyGo host in a nested Go module

Status: accepted

The replacement host will live in `apps/desktop/mygo-host` as an independent Go module, with the existing pnpm workspace coordinating frontend generation, backend bundling, MyGo builds, and packaging. This keeps the monorepo's current JavaScript ownership intact and avoids introducing a root-level Go module solely for the desktop shell.
