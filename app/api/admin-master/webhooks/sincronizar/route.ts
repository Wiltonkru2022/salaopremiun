import { NextResponse } from "next/server";
import {
  AdminMasterWebhookUseCaseError,
  sincronizarAdminMasterWebhooksUseCase,
} from "@/core/use-cases/admin-master/webhooks";
import { createAdminMasterWebhookService } from "@/services/adminMasterWebhookService";

export async function POST() {
  try {
    const result = await sincronizarAdminMasterWebhooksUseCase({
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
      error instanceof Error ? error.message : "Falha ao sincronizar webhooks.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
