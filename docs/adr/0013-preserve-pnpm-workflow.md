# Preserve the pnpm workflow

Status: accepted

The migration will keep the existing pnpm command names and their developer-facing purposes, including development, build, packaging, typecheck, and test entry points. Those scripts will orchestrate Go/MyGo steps internally so the nested Go module does not become a second workflow developers must learn.
