import type { DesktopApi, DesktopRuntimeStatus } from "../../electron/api";
import type { RemoteRequest } from "./remote-types";
import type {
  DiscoveryPlan,
  DiscoverySnapshot,
  InspectedWorkspace,
  NativeContext,
} from "@agentkib/backend/migration";
import { Backend, DesktopHost } from "@/mygo";

type Rpc = <T = unknown>(method: string, params?: unknown) => Promise<T>;

const rpc: Rpc = <T = unknown>(method: string, params: unknown = {}) =>
  Backend.call(method, params) as Promise<T>;
const unsubscribe = () => {};
const unsupported = (name: string) =>
  Promise.reject(new Error(`MyGo desktop method is not migrated yet: ${name}`));

const events: DesktopApi["events"] = {
  onWindowActivity: () => unsubscribe,
  onQuitRequested: () => unsubscribe,
  onThemeChanged: () => unsubscribe,
  onRefreshState: () => unsubscribe,
  onQuotaUpdated: () => unsubscribe,
  onNavigate: () => unsubscribe,
  onMenuCommand: () => unsubscribe,
  onRuntimeStatus: (listener) => {
    const status: DesktopRuntimeStatus = { state: "ready", restartCount: 0 };
    listener(status);
    return unsubscribe;
  },
};

const home: DesktopApi["home"] = {
  runtime: () => rpc("runtime.info"),
  workspaces: () => rpc("workspaces.list"),
  agentInstallations: () => rpc("agents.listInstallations"),
  agentTools: (force) => rpc("agents.toolsStatus", { force: force ?? false }),
  executeAgentTool: (agent, actionId) =>
    rpc("agents.toolExecute", { agent, action_id: actionId, confirmed: true }),
  catalogAssets: (input) =>
    rpc("catalog.searchAssets", {
      query: input.query ?? "",
      agent: input.agent,
      workspaceId: input.workspaceId,
      limit: input.limit ?? 500,
    }),
  globalMemories: (status) => rpc("memories.listGlobal", { status }),
  activity: (limit) => rpc("activity.list", { limit: limit ?? 200 }),
  discoveryReport: () => rpc("discovery.report"),
  scanRoots: () => rpc("discovery.listScanRoots"),
  addScanRoot: (path, maxDepth) => rpc("discovery.addScanRoot", { path, maxDepth }),
  removeScanRoot: (id) => rpc("discovery.removeScanRoot", { id }),
  excludedWorkspaces: () => rpc("discovery.listExcludedWorkspaces"),
  remoteGateways: () => rpc("gateways.list"),
  refreshGateways: () => rpc("gateways.refresh", { force: true }),
  saveRemoteGateway: (input) => rpc("gateways.save", { input }),
  refreshRemoteGateway: (id) => rpc("gateways.refresh", { id }),
  removeRemoteGateway: (id) => rpc("gateways.remove", { id }),
  insightsView: (query) => rpc("insights.view", { query }),
  insightsSummary: (query) => rpc("insights.summary", { query }),
  insightsStatus: () => rpc("insights.status"),
  quotaCollectorStatus: () => rpc("quota.collectorStatus"),
  quotaSnapshot: () => rpc("quota.snapshot"),
  quotaPreferences: () => rpc("quota.preferences"),
  setQuotaPreferences: (preferences) => rpc("quota.setPreferences", { preferences }),
  refreshQuota: () => rpc("quota.refresh", { force: true }),
  setQuotaAutoRefresh: (enabled) => rpc("quota.setAutoRefresh", { value: enabled }),
  setLocalAutoRefresh: (enabled) => rpc("set_local_auto_refresh", { value: enabled }),
  setQuotaPromptSeen: (seen) => rpc("quota.setPromptSeen", { value: seen }),
  storageOverview: () => rpc("storage.overview"),
  storageChildren: (workspaceId, relativePath) => rpc("storage.children", { workspaceId, relativePath }),
  refreshStorage: () => rpc("storage.refresh", { force: true }),
  openStoragePath: (workspaceId, relativePath) => rpc("storage.resolvePath", { workspaceId, relativePath }),
  cancelStorage: () => rpc("storage.cancel"),
  refreshDiscovery: async () => {
    const queuedAt = new Date().toISOString().replace(".000Z", "Z");
    const startedAt = new Date().toISOString().replace(".000Z", "Z");
    const roots = await rpc<Array<{ path: string; enabled: boolean; max_depth: number }>>(
      "discovery.listScanRoots",
      {},
    );
    const enabledRoots = roots
      .filter((root) => root.enabled)
      .map((root) => ({ path: root.path, max_depth: root.max_depth }));
    const [scanRoots, configured] = await Promise.all([
      rpc<Pick<DiscoverySnapshot, "candidates" | "errors" | "source_diagnostics">>(
        "backend.nativeScanRootDiscovery",
        { roots: enabledRoots },
      ),
      rpc<
        Pick<
          DiscoverySnapshot,
          | "candidates"
          | "errors"
          | "source_diagnostics"
          | "home_assets"
          | "installations"
          | "non_workspace_paths"
        >
      >("backend.nativeConfiguredDiscovery", {}),
    ]);
    const snapshot: DiscoverySnapshot = {
      non_workspace_paths: configured.non_workspace_paths,
      candidates: [...scanRoots.candidates, ...configured.candidates],
      installations: configured.installations,
      home_assets: configured.home_assets,
      errors: [...scanRoots.errors, ...configured.errors],
      source_diagnostics: [...scanRoots.source_diagnostics, ...configured.source_diagnostics],
    };
    const context = await rpc<NativeContext>("backend.nativeContext", {});
    const plan = await rpc<DiscoveryPlan>("backend.planDiscovery", { snapshot, context });
    const inspections = await rpc<InspectedWorkspace[]>("backend.inspectWorkspaces", {
      workspaces: plan.workspaces.map(({ id, path }) => ({ id, path })),
    });
    return rpc("discovery.refresh", {
      _plan: plan,
      _snapshot: snapshot,
      _inspections: inspections,
      _queuedAt: queuedAt,
      _startedAt: startedAt,
    });
  },
  refreshInsights: () => rpc("insights.refresh", { force: true }),
  updateOnboarding: (event) => rpc("onboarding.update", { event }),
  openObsidian: () => unsupported("home.openObsidian"),
  obsidianIntegration: () => rpc("obsidian.integration"),
  addObsidianVault: (path) => rpc("obsidian.addVault", { path }),
  linkWorkspaceToObsidian: (workspaceId, vaultPath, relativeTarget) =>
    rpc("obsidian.linkWorkspace", { workspaceId, vaultPath, relativeTarget }),
  unlinkWorkspaceFromObsidian: (workspaceId) => rpc("obsidian.unlinkWorkspace", { workspaceId }),
  openWorkspaceInObsidian: (workspaceId) => rpc("obsidian.openWorkspace", { workspaceId }),
  refreshStatus: () => Promise.resolve([]),
};

const mygoDesktopApi = {
  platform: "darwin" as NodeJS.Platform,
  events,
  runtime: {
    handshake: () => rpc("agentkib.handshake"),
    status: () => Promise.resolve<DesktopRuntimeStatus>({ state: "ready", restartCount: 0 }),
    retry: () => Promise.resolve(),
  },
  benchmark: { mark: () => Promise.resolve() },
  home,
  account: { request: () => unsupported("account.request"), onStatus: () => unsubscribe },
  shell: {
    openDirectory: (title?: string) =>
      DesktopHost.openDirectory(title ?? "").then((path) => path || undefined),
    openExternal: (url: string) => DesktopHost.openExternal(url),
    openFilesAndFoldersSettings: () => DesktopHost.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders"),
    openQuotaDashboard: () => Promise.resolve(),
    hideWindow: () => DesktopHost.hideWindow(),
    quit: () => DesktopHost.quit(),
  },
  settings: {
    setCloseBehavior: (value: unknown) => rpc("settings.setCloseBehavior", { value }),
    setLocale: (preference: unknown) => rpc("settings.setLocale", { preference }),
    setThemePreference: (preference: unknown) => rpc("settings.setThemePreference", { preference }),
    setAccentThemePreference: (preference: unknown) => rpc("settings.setAccentThemePreference", { preference }),
    setSidebarWidthPreference: (preference: unknown) => rpc("settings.setSidebarWidthPreference", { preference }),
    setAppIconPreference: async (preference: unknown) => {
      const runtime = await rpc("settings.setAppIconPreference", { preference });
      await DesktopHost.setAppIcon(String(preference));
      return runtime;
    },
  },
  updates: new Proxy({}, { get: (_target, name) => (...args: unknown[]) => unsupported(`updates.${String(name)}`) }),
  changes: {
    plan: (project: string, manifest: unknown, includeHome: boolean) =>
      rpc("changes.plan", { project, manifest, includeHome }),
    apply: (changeSet: unknown, approveHome: boolean, launchRequest?: unknown) =>
      rpc("changes.apply", { changeSet, approveHome, launchRequest }),
  },
  memories: {
    list: (project: string, status?: string) => rpc("memories.list", { project, status }),
    search: (project: string, query: string, limit?: number) =>
      rpc("memories.search", { project, query, limit: limit ?? 50 }),
    propose: (project: string, proposal: unknown) => rpc("memories.propose", { project, proposal }),
    review: (id: string, status: string, editedContent?: string) =>
      rpc("memories.review", { id, status, editedContent }),
  },
  sessions: {
    clearIndex: (workspaceId?: string) => rpc("sessions.clearIndex", { workspaceId }),
    setIndexEnabled: (enabled: boolean) => rpc("sessions.setIndexEnabled", { value: enabled }),
  },
  skills: new Proxy({}, { get: (_target, name) => (...args: unknown[]) => unsupported(`skills.${String(name)}`) }),
  mcp: new Proxy({}, { get: (_target, name) => (...args: unknown[]) => unsupported(`mcp.${String(name)}`) }),
  insights: new Proxy({}, { get: (_target, name) => (...args: unknown[]) => unsupported(`insights.${String(name)}`) }),
  workspace: {
    scan: (project: string) => rpc("workspace.scan", { project }),
    prepareManifest: (project: string) => rpc("workspace.prepareManifest", { project }),
    resolveContext: (project: string, cwd: string, agent: string) =>
      rpc("workspace.resolveContext", { project, cwd, agent }),
    exclude: (id: string) => rpc("workspace.exclude", { id }),
    restoreExcluded: (path: string) => rpc("workspace.restoreExcluded", { path }),
    sessions: (id: string) => rpc("workspace.sessions", { workspaceId: id }),
    sessionStatus: (id: string) => rpc("workspace.sessionStatus", { workspaceId: id }),
    refreshSessions: (id: string, force?: boolean) =>
      rpc("workspace.refreshSessions", { workspaceId: id, force: force ?? false }),
    sessionEvents: (id: string, cursor?: string, limit?: number) =>
      rpc("session.events", { sessionId: id, cursor, limit }),
    sourceCapability: (sessionId: string) =>
      rpc("sessions.sourceCapability", { sessionId }),
    nativeImports: (workspaceId: string) => rpc("sessions.nativeImports", { workspaceId }),
    doctorSummaries: (ids: string[]) => rpc("workspace.doctorSummaries", { workspaceIds: ids }),
    add: (path: string) => rpc("workspace.add", { path }),
    refresh: (id: string) => rpc("workspace.refresh", { id }),
    doctorReport: (id: string) => rpc("workspace.doctorReport", { id }),
    openers: (id: string) => rpc("workspace.openers", { workspaceId: id }),
    open: (id: string, openerId?: string) =>
      rpc("workspace.openWith", { workspaceId: id, openerId }),
  },
  remote: {
    request: (request: RemoteRequest) => rpc("remote.request", request),
  },
  claude: new Proxy({}, { get: (_target, name) => (...args: unknown[]) => unsupported(`claude.${String(name)}`) }),
  web: new Proxy({}, { get: (_target, name) => (...args: unknown[]) => unsupported(`web.${String(name)}`) }),
} as unknown as DesktopApi;

export function mygoDesktop(): DesktopApi {
  return mygoDesktopApi;
}
