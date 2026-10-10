package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/egoist/mygo"
)

// DesktopHost exposes the native shell operations previously provided by
// Electron IPC.
type DesktopHost struct {
	window *mygo.Window
}

func (h *DesktopHost) OpenDirectory(title string) (string, error) {
	paths, err := mygo.Dialog.Open(mygo.OpenDialogOptions{
		Parent:    h.window,
		Title:     title,
		Directory: true,
	})
	if err != nil || len(paths) == 0 {
		return "", err
	}
	return paths[0], nil
}

func (DesktopHost) OpenExternal(url string) error {
	return mygo.Shell.OpenExternal(url)
}

func (DesktopHost) OpenPath(path string) error {
	return mygo.Shell.OpenPath(path)
}

func (h *DesktopHost) HideWindow() {
	if h.window != nil {
		h.window.Hide()
	}
}

func (DesktopHost) Quit() {
	mygo.App.Quit()
}

const rendererBootstrapScript = `(function () {
  const unsubscribe = () => {};
  const eventApi = {
    onWindowActivity: () => unsubscribe,
    onQuitRequested: () => unsubscribe,
    onThemeChanged: () => unsubscribe,
    onRefreshState: () => unsubscribe,
    onQuotaUpdated: () => unsubscribe,
    onNavigate: () => unsubscribe,
    onMenuCommand: () => unsubscribe,
    onRuntimeStatus: (listener) => { listener({ state: "ready", restartCount: 0 }); return unsubscribe; },
  };
  const runtime = {
    app_name: "AgentKib", app_version: "0.1.0", app_channel: "development", updates_enabled: false,
    data_dir: "", database_path: "", mcp_package_root: "",
    mcp_hub: { enabled: false, status: "disabled", servers: [], error: null },
    mcp_network: { enabled: false, bind_address: "127.0.0.1", port: 0 },
    locale_preference: "system", effective_locale: "en-US", theme_preference: "dark", effective_theme: "dark",
    accent_theme_preference: "default", sidebar_width_preference: null, app_icon_preference: "default",
    tray_available: false, session_index_enabled: false, local_auto_refresh_enabled: false,
    quota_auto_refresh_enabled: false, quota_auto_refresh_prompt_seen: true,
    onboarding: { version: 1, acknowledged_version: 0, doctor_completed: false, repairable_count: 0, repair_applied: false },
  };
  const fallback = (name) => {
    if (["workspaces", "agentInstallations", "catalogAssets", "globalMemories", "activity", "remoteGateways", "scanRoots", "excludedWorkspaces", "refreshStatus", "doctorSummaries"].includes(name)) return Promise.resolve([]);
    if (name === "runtime") return Promise.resolve(runtime);
    return Promise.resolve(undefined);
  };
  const home = new Proxy({ runtime: () => Promise.resolve(runtime) }, { get(target, name) {
    return target[name] || ((...args) => fallback(name));
  }});
  const section = () => new Proxy({}, { get(_target, name) { return (...args) => fallback(name); } });
  globalThis.agentkibDesktop = {
    platform: "darwin", events: eventApi, home,
    runtime: { handshake: () => Promise.resolve({}), status: () => Promise.resolve({ state: "ready", restartCount: 0 }), retry: () => Promise.resolve() },
    benchmark: { mark: () => Promise.resolve() },
    account: { request: () => Promise.resolve({}), onStatus: () => unsubscribe },
    shell: section(), settings: section(), updates: section(), changes: section(), memories: section(), sessions: section(), skills: section(), mcp: section(), insights: section(), workspace: section(), remote: section(), claude: section(), web: section(),
  };
})();`

func main() {
	frontend, err := resolveFrontend()
	if err != nil {
		log.Fatal(err)
	}
	mygo.SetFrontend(os.DirFS(frontend))
	backend := &Backend{dataDir: os.Getenv("AGENTKIB_DATA_DIR")}
	desktop := &DesktopHost{}
	mygo.Bind(backend)
	mygo.Bind(desktop)
	mygo.App.OnQuit(func() { _ = backend.Close() })

	mygo.App.WhenReady(func() {
		if backend.dataDir == "" {
			backend.dataDir, _ = mygo.App.Path(mygo.PathUserData)
		}
		preloadScript := ""
		if os.Getenv("AGENTKIB_MYGO_COMPAT_SHIM") == "1" {
			preloadScript = rendererBootstrapScript
		}
		desktop.window = mygo.NewWindow(mygo.WindowOptions{
			Title:                "AgentKib",
			Width:                1360,
			Height:               860,
			MinWidth:             1280,
			MinHeight:            680,
			BackgroundColor:      "#0a0a0a",
			URL:                  "/",
			Page:                 mygo.PageOptions{PreloadScript: preloadScript, DevTools: mygo.DevToolsAuto},
			StateKey:             "main",
			TitleBarStyle:        mygo.TitleBarHiddenInset,
			TrafficLightPosition: &mygo.Point{X: 15, Y: 17},
			TitleBarHeight:       52,
		})
	})

	if err := mygo.App.Run(); err != nil {
		log.Fatal(err)
	}
}

func resolveFrontend() (string, error) {
	candidates := []string{}
	if configured := os.Getenv("AGENTKIB_MYGO_FRONTEND_DIST"); configured != "" {
		candidates = append(candidates, configured)
	}
	workingDirectory, err := os.Getwd()
	if err == nil {
		candidates = append(candidates,
			filepath.Join(workingDirectory, "../dist"),
			filepath.Join(workingDirectory, "apps/desktop/dist"),
		)
	}
	if executable, err := os.Executable(); err == nil {
		executableDirectory := filepath.Dir(executable)
		candidates = append(candidates, filepath.Join(executableDirectory, "../dist"))
	}

	for _, candidate := range candidates {
		absolute, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		if info, err := os.Stat(filepath.Join(absolute, "index.html")); err == nil && !info.IsDir() {
			return absolute, nil
		}
	}
	return "", fmt.Errorf("AgentKib frontend dist not found; set AGENTKIB_MYGO_FRONTEND_DIST")
}
