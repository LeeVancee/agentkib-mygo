package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"sync/atomic"
)

const runtimeProtocolVersion = 17

// Backend keeps the existing TypeScript runtime behind a small Wails binding.
// The public method is intentionally generic while the renderer migration is
// still in progress; feature-specific typed calls will be layered on later.
type Backend struct {
	mu          sync.Mutex
	process     *exec.Cmd
	stdin       io.WriteCloser
	stdout      *bufio.Scanner
	nextID      atomic.Uint64
	dataDir     string
	resourceDir string
	started     bool
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      uint64          `json:"id"`
	Result  json.RawMessage `json:"result"`
	Error   *rpcError       `json:"error"`
}

type rpcError struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

func (b *Backend) Call(method string, params any) (any, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if err := b.ensureStartedLocked(); err != nil {
		return nil, err
	}
	return b.requestLocked(method, params)
}

func (b *Backend) ensureStartedLocked() error {
	if b.started {
		return nil
	}
	entry, err := b.resolveBackendEntry()
	if err != nil {
		return err
	}
	node := os.Getenv("AGENTKIB_NODE_PATH")
	if node == "" {
		node = "node"
	}
	cmd := exec.Command(node, entry)
	cmd.Dir = filepath.Dir(entry)
	appFlavor := os.Getenv("AGENTKIB_APP_FLAVOR")
	if appFlavor == "" {
		appFlavor = "ai.agentkib.wails"
	}
	cmd.Env = append(os.Environ(), "AGENTKIB_APP_FLAVOR="+appFlavor)
	if b.dataDir != "" {
		cmd.Env = append(cmd.Env, "AGENTKIB_DATA_DIR="+b.dataDir)
	}
	if sidecar := b.resolveQuotaSidecar(); sidecar != "" {
		cmd.Env = append(cmd.Env, "AGENTKIB_QUOTA_SIDECAR="+sidecar)
	}
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		_ = stdin.Close()
		return err
	}
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		_ = stdin.Close()
		return err
	}
	b.process, b.stdin, b.stdout, b.started = cmd, stdin, bufio.NewScanner(stdout), true
	b.stdout.Buffer(make([]byte, 4096), 16*1024*1024)
	if _, err := b.requestLocked("agentkib.handshake", map[string]any{
		"protocolVersion": runtimeProtocolVersion,
		"client":          map[string]string{"name": "agentkib-wails", "version": "0.1.0"},
	}); err != nil {
		return err
	}
	_, err = b.requestLocked("backend.initialize", map[string]any{"dataDir": b.dataDir})
	return err
}

func (b *Backend) resolveQuotaSidecar() string {
	name := "agentkib-quota-sidecar"
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	candidates := []string{}
	if configured := os.Getenv("AGENTKIB_QUOTA_SIDECAR"); configured != "" {
		candidates = append(candidates, configured)
	}
	if resourceDir := b.resourceDir; resourceDir != "" {
		candidates = append(candidates,
			filepath.Join(resourceDir, "resources", platformResourceName(), "quota", name),
			filepath.Join(resourceDir, "quota", name),
		)
	}
	if cwd, err := os.Getwd(); err == nil {
		candidates = append(candidates,
			filepath.Join(cwd, "build", "quota", name),
			filepath.Join(cwd, "../build/quota", name),
			filepath.Join(cwd, "../../build/quota", name),
		)
	}
	if executable, err := os.Executable(); err == nil {
		executableDir := filepath.Dir(executable)
		candidates = append(candidates,
			filepath.Join(executableDir, "../Resources/quota", name),
			filepath.Join(executableDir, "../resources/quota", name),
			filepath.Join(executableDir, "quota", name),
		)
	}
	for _, candidate := range candidates {
		absolute, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		if info, err := os.Stat(absolute); err == nil && !info.IsDir() {
			return absolute
		}
	}
	return ""
}

func (b *Backend) requestLocked(method string, params any) (any, error) {
	id := b.nextID.Add(1)
	payload, err := json.Marshal(map[string]any{"jsonrpc": "2.0", "id": id, "method": method, "params": params})
	if err != nil {
		return nil, err
	}
	if _, err := b.stdin.Write(append(payload, '\n')); err != nil {
		return nil, err
	}
	for b.stdout.Scan() {
		var response rpcResponse
		if err := json.Unmarshal(b.stdout.Bytes(), &response); err != nil {
			return nil, fmt.Errorf("invalid backend JSON-RPC response: %w", err)
		}
		// Notifications from the TypeScript runtime share stdout with replies.
		if response.ID != id {
			continue
		}
		if response.Error != nil {
			return nil, fmt.Errorf("backend %s (%d): %s", method, response.Error.Code, response.Error.Message)
		}
		if len(response.Result) == 0 || string(response.Result) == "null" {
			return nil, nil
		}
		var result any
		if err := json.Unmarshal(response.Result, &result); err != nil {
			return nil, err
		}
		return result, nil
	}
	if err := b.stdout.Err(); err != nil {
		return nil, err
	}
	return nil, io.EOF
}

func (b *Backend) Close() error {
	b.mu.Lock()
	defer b.mu.Unlock()
	if !b.started {
		return nil
	}
	_, _ = b.requestLocked("agentkib.shutdown", map[string]any{})
	_ = b.stdin.Close()
	err := b.process.Wait()
	b.process, b.stdin, b.stdout, b.started = nil, nil, nil, false
	if err != nil && !errors.Is(err, os.ErrProcessDone) {
		return err
	}
	return nil
}

func (b *Backend) resolveBackendEntry() (string, error) {
	candidates := []string{}
	if configured := os.Getenv("AGENTKIB_BACKEND_ENTRY"); configured != "" {
		candidates = append(candidates, configured)
	}
	if cwd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Join(cwd, "../dist-electron/backend.cjs"), filepath.Join(cwd, "../../dist-electron/backend.cjs"))
	}
	if resourceDir := b.resourceDir; resourceDir != "" {
		candidates = append(candidates, filepath.Join(resourceDir, "dist-electron", "backend.cjs"))
	}
	if executable, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(executable), "../dist-electron/backend.cjs"))
	}
	for _, candidate := range candidates {
		absolute, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		if info, err := os.Stat(absolute); err == nil && !info.IsDir() {
			return absolute, nil
		}
	}
	return "", fmt.Errorf("AgentKib TypeScript backend not found; set AGENTKIB_BACKEND_ENTRY")
}

func (b *Backend) appIconPreference() string {
	data, err := os.ReadFile(filepath.Join(b.dataDir, "preferences.json"))
	if err != nil {
		return "white"
	}
	var preferences struct {
		AppIconPreference string `json:"app_icon_preference"`
	}
	if json.Unmarshal(data, &preferences) == nil && preferences.AppIconPreference == "black" {
		return "black"
	}
	return "white"
}

func platformResourceName() string {
	return runtime.GOOS + "-" + runtime.GOARCH
}
