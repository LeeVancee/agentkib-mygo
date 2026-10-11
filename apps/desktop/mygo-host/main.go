package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// Wails embeds the built frontend and the resources needed by the Node sidecar
// into the desktop binary. Development can override both roots with env vars.
//
//go:embed all:frontend/dist all:dist-electron all:resources
var embeddedAssets embed.FS

const (
	appName       = "AgentKib"
	appIdentifier = "ai.agentkib"
	appVersion    = "0.17.0"
)

type DesktopHost struct {
	app         *application.App
	window      *application.WebviewWindow
	resourceDir string
}

func (h *DesktopHost) SetAppIcon(preference string) error {
	if preference != "white" && preference != "black" {
		return fmt.Errorf("invalid app icon preference: %s", preference)
	}

	suffix := ""
	if runtime.GOOS == "darwin" {
		suffix = "-macos"
	}
	filename := fmt.Sprintf("app-icon-%s%s.png", preference, suffix)
	data, err := os.ReadFile(filepath.Join(h.resourceDir, "resources", "icons", filename))
	if err != nil {
		return fmt.Errorf("read application icon %s: %w", filename, err)
	}
	h.app.SetIcon(data)
	return nil
}

func (h *DesktopHost) OpenDirectory(title string) (string, error) {
	dialog := h.app.Dialog.OpenFile().
		CanChooseFiles(false).
		CanChooseDirectories(true).
		SetTitle(title)
	if h.window != nil {
		dialog.AttachToWindow(h.window)
	}
	return dialog.PromptForSingleSelection()
}

func (h *DesktopHost) OpenExternal(url string) error {
	return h.app.Browser.OpenURL(url)
}

func (h *DesktopHost) OpenPath(path string) error {
	return h.app.Env.OpenFileManager(path, false)
}

func (h *DesktopHost) HideWindow() {
	if h.window != nil {
		h.window.Hide()
	}
}

func (h *DesktopHost) Quit() {
	h.app.Quit()
}

func main() {
	frontend, err := fs.Sub(embeddedAssets, "frontend/dist")
	if err != nil {
		log.Fatal(err)
	}

	resourceDir := os.Getenv("AGENTKIB_RESOURCE_ROOT")
	cleanup := func() {}
	if resourceDir == "" {
		resourceDir, cleanup, err = materializeEmbeddedResources()
		if err != nil {
			log.Fatal(err)
		}
	}
	defer cleanup()

	dataDir := resolveDataDir()
	backend := &Backend{dataDir: dataDir, resourceDir: resourceDir}
	desktop := &DesktopHost{resourceDir: resourceDir}

	app := application.New(application.Options{
		Name:        appName,
		Description: "Inspect, organize, and safely maintain coding-agent context.",
		Services: []application.Service{
			application.NewService(backend),
			application.NewService(desktop),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(frontend),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})
	desktop.app = app

	desktop.window = app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:             "main",
		Title:            appName,
		Width:            1360,
		Height:           860,
		MinWidth:         1280,
		MinHeight:        680,
		BackgroundColour: application.NewRGB(10, 10, 10),
		URL:              "/",
		DevToolsEnabled:  os.Getenv("AGENTKIB_WAILS_DEVTOOLS") == "1",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 52,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
	})
	if preference := backend.appIconPreference(); preference != "" {
		if err := desktop.SetAppIcon(preference); err != nil {
			log.Printf("set application icon: %v", err)
		}
	}

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}

func resolveDataDir() string {
	if configured := os.Getenv("AGENTKIB_DATA_DIR"); configured != "" {
		return configured
	}
	base, err := os.UserConfigDir()
	if err != nil {
		return filepath.Join(os.TempDir(), appIdentifier)
	}
	return filepath.Join(base, appIdentifier)
}

func materializeEmbeddedResources() (string, func(), error) {
	root, err := os.MkdirTemp("", "agentkib-wails3-resources-")
	if err != nil {
		return "", nil, err
	}
	cleanup := func() { _ = os.RemoveAll(root) }

	err = fs.WalkDir(embeddedAssets, "dist-electron", func(path string, entry fs.DirEntry, walkErr error) error {
		return materializeEmbeddedEntry(root, path, entry, walkErr)
	})
	if err == nil {
		err = fs.WalkDir(embeddedAssets, "resources", func(path string, entry fs.DirEntry, walkErr error) error {
			return materializeEmbeddedEntry(root, path, entry, walkErr)
		})
	}
	if err != nil {
		cleanup()
		return "", nil, err
	}
	return root, cleanup, nil
}

func materializeEmbeddedEntry(root, path string, entry fs.DirEntry, walkErr error) error {
	if walkErr != nil {
		return walkErr
	}
	if entry.IsDir() {
		return os.MkdirAll(filepath.Join(root, filepath.FromSlash(path)), 0o755)
	}
	data, err := fs.ReadFile(embeddedAssets, path)
	if err != nil {
		return err
	}
	target := filepath.Join(root, filepath.FromSlash(path))
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	return os.WriteFile(target, data, 0o755)
}
