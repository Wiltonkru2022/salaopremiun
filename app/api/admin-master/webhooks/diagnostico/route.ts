import { NextResponse } from "next/server";
import {
  AdminMasterWebhookUseCaseError,
  diagnosticarAdminMasterWebhookUseCase,
} from "@/core/use-cases/admin-master/webhooks";
import { createAdminMasterWebhookService } from "@/services/adminMasterWebhookService";

export async function POST() {
  try {
    const result = await diagnosticarAdminMasterWebhookUseCase({
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
      error instanceof Error ? error.message : "Falha ao testar endpoint Asaas.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
