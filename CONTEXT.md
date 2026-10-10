# AgentKib Desktop Migration

This context defines the product boundaries used while moving AgentKib's desktop host from Electron to MyGo.

## Product boundaries

**Desktop shell**:
The native desktop environment around AgentKib, including its windows, menus, tray, operating-system integrations, and app lifecycle.
_Avoid_: Desktop UI, renderer

**Product logic**:
AgentKib's user-facing capabilities and the application services that provide them, independent of which desktop shell hosts them.
_Avoid_: Shell behavior

**Desktop API**:
The renderer-facing contract exposed as `window.agentkibDesktop`, covering desktop actions, product services, and events without prescribing the host implementation.
_Avoid_: Electron IPC

**Desktop host**:
The Go/MyGo process that owns windows and operating-system integrations, manages the TypeScript backend process, and adapts host capabilities to the Desktop API.
_Avoid_: Renderer host, backend

**TypeScript backend**:
The existing Node process that owns AgentKib's product services and persistent application data behind the desktop host.
_Avoid_: MyGo backend

**Desktop parity**:
The requirement that the MyGo host preserves every user-visible desktop behavior supported by the Electron host at the migration cutover.
_Avoid_: Feature equivalence, UI parity

**MyGo host module**:
The independent Go module under `apps/desktop/mygo-host` that builds the replacement desktop host while the repository remains a pnpm workspace.
_Avoid_: Root Go module

**Migration success**:
Desktop parity at cutover, plus measured improvement or no regression in startup time, resident memory, package size, and cross-platform build maintenance.
_Avoid_: It works, performance parity

**Product data root**:
The stable `ai.agentkib` directory containing backend databases, preferences, caches, and recoverable application state across host upgrades.
_Avoid_: Electron profile, MyGo profile
