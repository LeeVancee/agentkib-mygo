# Generate Go runtime protocol metadata

Status: accepted

`packages/runtime-protocol/src/index.ts` remains the single protocol source of truth. The existing `pnpm protocol:generate` step will also emit the Go constants and metadata needed by the MyGo host, so protocol versions, method names, and notifications cannot drift between TypeScript and Go.
