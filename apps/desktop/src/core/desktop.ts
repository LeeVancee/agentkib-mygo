import type { DesktopApi } from "../../electron/api";
import { mygoDesktop } from "./mygo-desktop";

export function desktopApi(): DesktopApi {
  const desktop = globalThis.window?.agentkibDesktop;
  return desktop ?? mygoDesktop();
}
