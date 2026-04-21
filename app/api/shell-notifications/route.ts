import { loadShellNotificationsUseCase } from "@/core/use-cases/notifications/shell";
import { createShellNotificationService } from "@/services/shellNotificationService";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await loadShellNotificationsUseCase({
    service: createShellNotificationService(),
  });

  return Response.json(result.body, { status: result.status });
}
