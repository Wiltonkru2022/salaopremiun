import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AssinaturaCronServiceError,
  type AssinaturaCronService,
} from "@/services/assinaturaCronService";

export class AssinaturaCronUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AssinaturaCronUseCaseError";
  }
}

export async function executarCronRenovacaoAssinaturasUseCase(params: {
  authorizationHeader: string | null;
  service: AssinaturaCronService;
}) {
  let supabaseAdmin: SupabaseClient | null = null;

  try {
    if (!params.service.validarCron(params.authorizationHeader)) {
      throw new AssinaturaCronUseCaseError("Nao autorizado.", 401);
    }

    supabaseAdmin = params.service.criarSupabaseAdmin();
    const { total, resultados } = await params.service.executarRenovacao(
      supabaseAdmin
    );

    return {
      status: 200,
      body: {
        ok: true,
        total,
        resultados,
      },
    };
  } catch (error) {
    await params.service.reportarFalhaCron({
      supabaseAdmin,
      error,
    });

    if (error instanceof AssinaturaCronUseCaseError) {
      throw error;
    }

    if (error instanceof AssinaturaCronServiceError) {
      throw new AssinaturaCronUseCaseError(error.message, error.status);
    }

    throw new AssinaturaCronUseCaseError(
      error instanceof Error ? error.message : "Erro ao renovar assinaturas.",
      500
    );
  }
}
