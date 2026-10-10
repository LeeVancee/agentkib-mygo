# Use a generic MyGo binding behind the Desktop API

Status: accepted

The Go host will expose a small generic request and event surface, such as `call`, `subscribe`, and `unsubscribe`, and a JavaScript compatibility shim will map it to the existing renderer `DesktopApi`. The renderer's TypeScript contract remains the type source; the host will not duplicate every product method as a separate Go binding.
