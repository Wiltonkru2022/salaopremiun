import type { ShellNotificationsResponse } from "@/lib/notifications/contracts";
import { loadPainelShellData } from "@/lib/painel/load-painel-shell-data";

export async function loadShellNotifications(): Promise<ShellNotificationsResponse> {
  const result = await loadPainelShellData();
  if (!result.ok) {
    return { notifications: [] };
  }
  return {
    notifications: result.data.notifications,
  };
}
