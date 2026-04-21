import { loadShellNotifications } from "@/lib/notifications/shell-notification-service";

export function createShellNotificationService() {
  return {
    async load() {
      return loadShellNotifications();
    },
  };
}

export type ShellNotificationService = ReturnType<
  typeof createShellNotificationService
>;
