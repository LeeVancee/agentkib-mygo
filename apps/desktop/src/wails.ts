import {
  Backend as BackendService,
  DesktopHost as DesktopHostService,
} from "@/wailsjs/github.com/starroyhq/agentkib/apps/desktop/mygo-host";

export const Backend = {
  call(method: string, params: unknown): Promise<unknown> {
    return BackendService.Call(method, params);
  },
  close(): Promise<void> {
    return BackendService.Close();
  },
} as const;

export const DesktopHost = {
  hideWindow(): Promise<void> {
    return DesktopHostService.HideWindow();
  },
  openDirectory(title: string): Promise<string> {
    return DesktopHostService.OpenDirectory(title);
  },
  openExternal(url: string): Promise<void> {
    return DesktopHostService.OpenExternal(url);
  },
  openPath(path: string): Promise<void> {
    return DesktopHostService.OpenPath(path);
  },
  quit(): Promise<void> {
    return DesktopHostService.Quit();
  },
  setAppIcon(preference: string): Promise<void> {
    return DesktopHostService.SetAppIcon(preference);
  },
} as const;
