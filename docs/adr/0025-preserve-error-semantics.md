# Preserve Desktop API error semantics

Status: accepted

The MyGo adapter will preserve JSON-RPC error codes, messages, data payloads, cancellation behavior, and runtime-unavailable classification exactly as observed by the existing `DesktopApi`. The adapter must not wrap or normalize errors in a way that changes renderer behavior.
