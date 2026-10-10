import type { DesktopApi, DesktopRuntimeStatus } from "../../electron/api";
import { Backend } from "@/mygo";

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
  refreshDiscovery: () => rpc("discovery.refresh", { force: true }),
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
  shell: new Proxy({}, { get: (_target, name) => (...args: unknown[]) => unsupported(`shell.${String(name)}`) }),
  settings: {
    setCloseBehavior: (value: unknown) => rpc("settings.setCloseBehavior", { value }),
    setLocale: (preference: unknown) => rpc("settings.setLocale", { preference }),
    setThemePreference: (preference: unknown) => rpc("settings.setThemePreference", { preference }),
    setAccentThemePreference: (preference: unknown) => rpc("settings.setAccentThemePreference", { preference }),
    setSidebarWidthPreference: (preference: unknown) => rpc("settings.setSidebarWidthPreference", { preference }),
    setAppIconPreference: (preference: unknown) => rpc("settings.setAppIconPreference", { preference }),
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
    sessions: (id: string) => rpc("workspace.sessions", { id }),
    sessionStatus: (id: string) => rpc("workspace.sessionStatus", { id }),
    refreshSessions: (id: string, force?: boolean) => rpc("workspace.refreshSessions", { id, force }),
    sessionEvents: (id: string, cursor?: string, limit?: number) =>
      rpc("session.events", { id, cursor, limit }),
    doctorSummaries: (ids: string[]) => rpc("workspace.doctorSummaries", { workspaceIds: ids }),
    add: (path: string) => unsupported(`workspace.add(${path})`),
    refresh: (id: string) => unsupported(`workspace.refresh(${id})`),
    doctorReport: (id: string) => rpc("workspace.doctorReport", { id }),
  },
  remote: new Proxy({}, { get: (_target, name) => (...args: unknown[]) => unsupported(`remote.${String(name)}`) }),
  claude: new Proxy({}, { get: (_target, name) => (...args: unknown[]) => unsupported(`claude.${String(name)}`) }),
  web: new Proxy({}, { get: (_target, name) => (...args: unknown[]) => unsupported(`web.${String(name)}`) }),
} as unknown as DesktopApi;

export function mygoDesktop(): DesktopApi {
  return mygoDesktopApi;
}
