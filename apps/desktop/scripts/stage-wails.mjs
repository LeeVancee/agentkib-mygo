import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hostRoot = path.join(desktopRoot, "mygo-host");

await mkdir(hostRoot, { recursive: true });

const stages = [
  [path.join(desktopRoot, "dist"), path.join(hostRoot, "frontend/dist")],
  [path.join(desktopRoot, "dist-electron"), path.join(hostRoot, "dist-electron")],
  [path.join(desktopRoot, "resources/icons"), path.join(hostRoot, "resources/icons")],
];

for (const [source, target] of stages) {
  await rm(target, { recursive: true, force: true });
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

process.stdout.write("AgentKib Wails resources staged.\n");
