import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildMfaRecoveryMessage,
  buildMfaRecoverySubject,
  generateMfaRecoveryCode,
  MFA_RECOVERY_DELAY_HOURS,
} from "@/lib/auth/mfa-recovery";
import { createSuporteTicketService } from "@/services/suporteTicketService";

export async function POST() {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const service = createSuporteTicketService();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Sessao invalida." },
        { status: 401 }
      );
    }

    const { data: factorsData, error: factorError } =
      await supabaseAdmin.auth.admin.mfa.listFactors({
        userId: user.id,
      });

    if (factorError) {
      return NextResponse.json(
        {
          ok: false,
          error: factorError.message || "Erro ao carregar fatores do autenticador.",
        },
        { status: 400 }
      );
    }

    const hasTotpFactor = Boolean(
      factorsData?.factors?.some(
        (factor) => factor.factor_type === "totp" && factor.status === "verified"
      )
    );

    if (!hasTotpFactor) {
      return NextResponse.json(
        {
          ok: false,
          error: "Nenhum autenticador ativo foi encontrado para esta conta.",
        },
        { status: 400 }
      );
    }

    const context = await service.getPainelContext();
    const recoveryCode = generateMfaRecoveryCode();
    const ticket = await service.criarTicket({
      context,
      assunto: buildMfaRecoverySubject(recoveryCode),
      categoria: "acesso",
      prioridade: "alta",
      mensagem: buildMfaRecoveryMessage(recoveryCode),
      contexto: {
        tipo_fluxo: "recuperacao_2fa",
        recovery_code: recoveryCode,
        recovery_delay_hours: MFA_RECOVERY_DELAY_HOURS,
        origem_tela: "/perfil-salao",
      },
    });

    return NextResponse.json({
      ok: true,
      ticket,
      recoveryCode,
      delayHours: MFA_RECOVERY_DELAY_HOURS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao abrir recuperacao do autenticador.",
      },
      { status: 500 }
    );
  }
}
