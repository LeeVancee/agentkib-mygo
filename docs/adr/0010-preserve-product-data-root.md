# Preserve the product data root

Status: accepted

MyGo will keep `ai.agentkib` as the product data root and pass that same directory to the TypeScript backend. Host-specific profile and cache files may use a separate subdirectory, but existing databases, preferences, and recovery state will not be moved or renamed during the Electron-to-MyGo upgrade.
