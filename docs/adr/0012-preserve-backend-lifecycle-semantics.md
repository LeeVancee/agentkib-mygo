# Preserve backend lifecycle semantics

Status: accepted

The MyGo host will retain the existing TypeScript backend lifecycle contract: `starting`, `ready`, `restarting`, `failed`, and `stopping` states, bounded restart behavior, handshake timeouts, pending-request handling, status events, and graceful shutdown. Only process launching and transport mechanics change.
