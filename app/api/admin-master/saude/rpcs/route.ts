import { NextResponse } from "next/server";
import {
  AdminMasterSaudeUseCaseError,
  validarAdminMasterRpcsUseCase,
} from "@/core/use-cases/admin-master/saude";
import { createAdminMasterSaudeService } from "@/services/adminMasterSaudeService";

export async function GET() {
  try {
    const result = await validarAdminMasterRpcsUseCase({
      service: createAdminMasterSaudeService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AdminMasterSaudeUseCaseError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          details: error.details,
          required: error.required,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro ao validar RPCs.",
      },
      { status: 500 }
    );
  }
}
