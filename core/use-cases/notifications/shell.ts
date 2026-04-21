import type { ShellNotificationService } from "@/services/shellNotificationService";

export async function loadShellNotificationsUseCase(params: {
  service: ShellNotificationService;
}) {
  const payload = await params.service.load();

  return {
    status: 200,
    body: payload,
  };
}
