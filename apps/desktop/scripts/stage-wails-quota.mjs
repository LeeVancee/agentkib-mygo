import { chmod, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hostRoot = path.join(desktopRoot, "mygo-host");
const resourcesRoot = path.join(hostRoot, "resources");
const quotaRoot = path.join(desktopRoot, "resources/quota");
const genericBundle = path.join(quotaRoot, "resources/CodexBar_CodexBarCore.bundle");
const linuxBundle = path.join(quotaRoot, "resources/linux/CodexBar_CodexBarCore.bundle");
const linuxCollector = path.join(quotaRoot, "resources/linux/CodexBarCLI");

const targets = [
  {
    platform: "darwin-arm64",
    source: path.join(quotaRoot, "binaries/agentkib-quota-sidecar-aarch64-apple-darwin"),
    bundle: genericBundle,
  },
  {
    platform: "darwin-amd64",
    source: path.join(quotaRoot, "binaries/agentkib-quota-sidecar-x86_64-apple-darwin"),
    bundle: genericBundle,
  },
  {
    platform: "linux-amd64",
    source: path.join(quotaRoot, "binaries/agentkib-quota-sidecar-x86_64-unknown-linux-gnu"),
    bundle: linuxBundle,
    collector: linuxCollector,
  },
  {
    platform: "windows-amd64",
    source: path.join(quotaRoot, "resources/windows/agentkib-quota-sidecar.exe"),
    executable: "agentkib-quota-sidecar.exe",
  },
];

await mkdir(resourcesRoot, { recursive: true });
for (const target of targets) {
  const outputRoot = path.join(resourcesRoot, target.platform, "quota");
  await rm(outputRoot, { recursive: true, force: true });
  try {
    await mkdir(outputRoot, { recursive: true });
    await cp(target.source, path.join(outputRoot, target.executable ?? "agentkib-quota-sidecar"));
    if (!target.executable) await chmod(path.join(outputRoot, "agentkib-quota-sidecar"), 0o755);
    if (target.bundle) await cp(target.bundle, path.join(outputRoot, path.basename(target.bundle)), { recursive: true });
    if (target.collector) {
      await mkdir(path.join(outputRoot, "linux"), { recursive: true });
      await cp(target.collector, path.join(outputRoot, "linux/CodexBarCLI"));
      await chmod(path.join(outputRoot, "linux/CodexBarCLI"), 0o755);
    }
    process.stdout.write(`AgentKib Wails quota: staged ${target.platform}.\n`);
  } catch (error) {
    await rm(outputRoot, { recursive: true, force: true });
    process.stdout.write(`AgentKib Wails quota: skipped ${target.platform} (${error.code ?? error.message}).\n`);
  }
}
