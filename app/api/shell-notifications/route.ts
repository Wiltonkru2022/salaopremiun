import { loadShellNotifications } from "@/lib/notifications/shell-notification-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await loadShellNotifications();
  return Response.json(payload);
}
