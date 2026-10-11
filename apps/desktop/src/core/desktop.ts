import type { DesktopApi } from "../../electron/api";
import { wailsDesktop } from "./wails-desktop";

export function desktopApi(): DesktopApi {
  const desktop = globalThis.window?.agentkibDesktop;
  return desktop ?? wailsDesktop();
}
