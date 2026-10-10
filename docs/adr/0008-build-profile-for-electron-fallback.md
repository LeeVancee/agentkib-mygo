# Keep Electron fallback out of the product surface

Status: accepted

During migration, Electron remains available through a development or CI build profile and an explicit host-selection switch. MyGo is the default host, and the installed product will not expose a permanent host-selection setting to users.
