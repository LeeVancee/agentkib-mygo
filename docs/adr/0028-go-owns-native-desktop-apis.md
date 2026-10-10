# Let the Go host own native desktop APIs

Status: accepted

The Go/MyGo host owns windows, tray and menus, dialogs, clipboard and shell, power and display events, single-instance behavior, updater, secure storage, deep links, and file associations. The TypeScript backend remains responsible for product services and data and does not acquire a new dependency on Electron APIs.
