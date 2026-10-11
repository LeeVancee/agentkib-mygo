# Desktop release workflow

AgentKib desktop packages are built by the `Desktop MyGo packages` GitHub
Actions workflow in `.github/workflows/desktop-mygo.yml`.

The workflow keeps the existing pnpm and TypeScript build steps, then builds
the MyGo host and its TypeScript backend for macOS, Windows, and Linux. A tag
build creates a draft GitHub Release after all three package jobs finish.

## Build packages

Run the workflow manually from the Actions page for a branch, or push a tag:

```bash
git tag -a v0.17.0 -m "AgentKib v0.17.0"
git push origin v0.17.0
```

The workflow uses Node.js 22 and pnpm 12.10.1 for the React renderer and
TypeScript backend, Go 1.27.1 from `apps/desktop/mygo-host/go.mod`, MyGo 0.4.0,
and NSIS on Ubuntu for the Windows installer.

The package jobs build these targets:

| Job | Targets | Artifacts |
| --- | --- | --- |
| macOS | `darwin/arm64`, `darwin/amd64` | DMG files |
| Windows | `windows/amd64` | NSIS installer |
| Linux | `linux/amd64` | Debian package, tarball, `install.sh` |

Generated files are written below:

```text
apps/desktop/mygo-host/build/
```

The generated `dist`, `dist-electron`, `build`, and staged MyGo resources are
ignored by Git and are not release source files.

## Draft releases

For a `v*` tag, the final job creates or reuses a draft release and uploads the
artifacts from every platform job. Review the files in the draft before
publishing it. Re-running a failed tag build replaces files with the same
names in that draft.

The workflow deliberately leaves the release as a draft until signing,
notarization, and update signing secrets are configured for Wails.

## Local package build

Build the current host platform with:

```bash
pnpm build
```

Build the supported targets explicitly with:

```bash
cd apps/desktop
pnpm build:web
pnpm backend:build
pnpm wails:build
```

Wails currently produces a functional preview binary for the host platform;
installer packaging, platform signing, and notarization still need to be
configured before distributing releases outside a controlled review.
