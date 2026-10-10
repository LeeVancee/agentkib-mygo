# Preserve Desktop API streaming semantics

Status: accepted

The MyGo adapter must preserve the existing event-stream behavior, including ordering, cursors, acknowledgements, cancellation, reconnect handling, and bounded backpressure. A page or window that closes must release its subscriptions, and unacknowledged events must not grow without bound.
