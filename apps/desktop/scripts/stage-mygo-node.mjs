import { chmod, cp, mkdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resourcesRoot = path.join(desktopRoot, "mygo-host/resources");
const source = process.execPath;

async function stage(targetPlatform, arch) {
  const output = path.join(resourcesRoot, targetPlatform, "node");
  await rm(output, { force: true });
  await mkdir(path.dirname(output), { recursive: true });

  if (process.platform === "darwin") {
    const temporary = `${output}.tmp`;
    await execFileAsync("lipo", [source, "-thin", arch, "-output", temporary]);
    await cp(temporary, output);
    await rm(temporary, { force: true });
  } else {
    await cp(source, output);
  }
  await chmod(output, 0o755);
  process.stdout.write(`AgentKib MyGo Node: staged ${targetPlatform}.\n`);
}

if (process.platform === "darwin") {
  await stage("darwin-arm64", "arm64");
  await stage("darwin-amd64", "x86_64");
} else {
  await stage(`${process.platform}-${process.arch}`, process.arch);
}
