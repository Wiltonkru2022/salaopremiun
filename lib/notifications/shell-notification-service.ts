import type { ShellNotificationsResponse } from "@/lib/notifications/contracts";
import { loadPainelShellData } from "@/lib/painel/load-painel-shell-data";

const SHELL_NOTIFICATIONS_TIMEOUT_MS = 3000;

function timeoutResult(): Promise<{ ok: false; timeout: true }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ok: false, timeout: true }), SHELL_NOTIFICATIONS_TIMEOUT_MS);
  });
}

export async function loadShellNotifications(): Promise<ShellNotificationsResponse> {
  try {
    const result = await Promise.race([
      loadPainelShellData(),
      timeoutResult(),
    ]);

    if (!("ok" in result) || !result.ok) {
      return { notifications: [] };
    }

    if (!("data" in result)) {
      return { notifications: [] };
    }

    return {
      notifications: result.data.notifications,
    };
  } catch (error) {
    console.error("Falha ao carregar notificações do shell:", error);
    return { notifications: [] };
  }
}
