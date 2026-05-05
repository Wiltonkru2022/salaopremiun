import { NextResponse } from "next/server";
import {
  AdminMasterWebhookUseCaseError,
  reprocessarAdminMasterWebhookUseCase,
} from "@/core/use-cases/admin-master/webhooks";
import { createAdminMasterWebhookService } from "@/services/adminMasterWebhookService";

type ReprocessarWebhookRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  context: ReprocessarWebhookRouteContext
) {
  try {
    const { id } = await context.params;
    const result = await reprocessarAdminMasterWebhookUseCase({
      webhookId: id,
      service: createAdminMasterWebhookService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AdminMasterWebhookUseCaseError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Falha ao reprocessar webhook.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
