import { getSupabaseAdmin } from "@/lib/supabase/admin";

function diferencaEmDias(dataAlvo: Date, dataBase: Date) {
  const alvo = new Date(
    dataAlvo.getFullYear(),
    dataAlvo.getMonth(),
    dataAlvo.getDate()
  );

  const base = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    dataBase.getDate()
  );

  const diffMs = alvo.getTime() - base.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getStatusAssinaturaServidor(
  status?: string | null,
  vencimentoEm?: string | null
) {
  const statusNormalizado = String(status || "").toLowerCase();

  if (!["ativo", "ativa", "pago"].includes(statusNormalizado)) {
    return {
      ativa: false,
      vencida: true,
      bloqueioTotal: true,
    };
  }

  if (!vencimentoEm) {
    return {
      ativa: false,
      vencida: true,
      bloqueioTotal: true,
    };
  }

  const hoje = new Date();
  const vencimento = new Date(`${vencimentoEm}T23:59:59`);

  if (Number.isNaN(vencimento.getTime())) {
    return {
      ativa: false,
      vencida: true,
      bloqueioTotal: true,
    };
  }

  const diasRestantes = diferencaEmDias(vencimento, hoje);
  const vencida = diasRestantes < 0;
  const diasAtraso = vencida ? Math.abs(diasRestantes) : 0;
  const bloqueioTotal = vencida && diasAtraso > 3;

  return {
    ativa: !vencida,
    vencida,
    bloqueioTotal,
  };
}

export async function validarAssinaturaSalao(idSalao: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: assinatura, error } = await supabaseAdmin
    .from("assinaturas")
    .select("status, vencimento_em")
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) {
    throw new Error("Erro ao validar assinatura do salão.");
  }

  const statusAssinatura = getStatusAssinaturaServidor(
    assinatura?.status,
    assinatura?.vencimento_em
  );

  if (statusAssinatura.bloqueioTotal) {
    throw new Error(
      "Assinatura bloqueada por atraso. Regularize o pagamento para continuar."
    );
  }

  return statusAssinatura;
}