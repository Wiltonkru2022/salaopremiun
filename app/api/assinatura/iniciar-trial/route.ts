import { NextResponse } from "next/server";
import { addDays, format } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function getSupabaseServer() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });
}

async function validarSalaoDoUsuario(idSalao: string) {
  const supabase = await getSupabaseServer();
  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new HttpError("Erro ao validar usuário autenticado.", 401);
  }

  if (!user) {
    throw new HttpError("Usuário não autenticado.", 401);
  }

  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from("usuarios")
    .select("id_salao, status, nivel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    throw new HttpError("Erro ao validar vínculo do usuário com o salão.", 500);
  }

  if (!usuario?.id_salao) {
    throw new HttpError("Usuário sem salão vinculado.", 403);
  }

  if (String(usuario.status || "").toLowerCase() !== "ativo") {
    throw new HttpError("Usuário inativo.", 403);
  }

  if (usuario.id_salao !== idSalao) {
    throw new HttpError("Acesso negado para este salão.", 403);
  }

  if (String(usuario.nivel || "").toLowerCase() !== "admin") {
    throw new HttpError("Somente administrador pode iniciar o trial.", 403);
  }
}

type BodyInput = {
  idSalao: string;
};

type PlanoTrialRow = {
  id: string | null;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor_mensal: number | string;
  limite_usuarios: number | null;
  limite_profissionais: number | null;
  ativo: boolean;
};

const PLANO_TRIAL_PADRAO: PlanoTrialRow = {
  id: null,
  codigo: "teste_gratis",
  nome: "Teste gratis",
  descricao: "Periodo de teste gratuito de 7 dias.",
  valor_mensal: 0,
  limite_usuarios: 1,
  limite_profissionais: 3,
  ativo: true,
};

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await req.json()) as BodyInput;

    const idSalao = String(body.idSalao || "").trim();

    if (!idSalao) {
      return NextResponse.json(
        { error: "idSalao é obrigatório." },
        { status: 400 }
      );
    }

    await validarSalaoDoUsuario(idSalao);

    const { data: salao, error: salaoError } = await supabaseAdmin
      .from("saloes")
      .select("id, plano, trial_ativo, trial_inicio_em, trial_fim_em")
      .eq("id", idSalao)
      .maybeSingle();

    if (salaoError) {
      return NextResponse.json(
        { error: salaoError.message || "Erro ao consultar salão." },
        { status: 500 }
      );
    }

    if (!salao?.id) {
      return NextResponse.json(
        { error: "Salão não encontrado." },
        { status: 404 }
      );
    }

    const { data: planoTesteData, error: planoError } = await supabaseAdmin
      .from("planos_saas")
      .select(`
        id,
        codigo,
        nome,
        descricao,
        valor_mensal,
        limite_usuarios,
        limite_profissionais,
        ativo
      `)
      .eq("codigo", "teste_gratis")
      .eq("ativo", true)
      .maybeSingle();

    if (planoError) {
      return NextResponse.json(
        { error: planoError.message || "Erro ao consultar plano de teste." },
        { status: 500 }
      );
    }

    if (!planoTesteData?.id) {
      console.warn(
        "Plano teste_gratis nao encontrado ou inativo; usando fallback interno."
      );
    }

    const planoTeste =
      (planoTesteData as PlanoTrialRow | null) || PLANO_TRIAL_PADRAO;

    const agora = new Date();
    const trialFim = addDays(agora, 7);

    const agoraIso = agora.toISOString();
    const trialFimIso = trialFim.toISOString();
    const vencimentoEm = format(trialFim, "yyyy-MM-dd");

    const valorMensal = Number(planoTeste.valor_mensal || 0);
    const limiteUsuarios = Number(planoTeste.limite_usuarios || 0);
    const limiteProfissionais = Number(planoTeste.limite_profissionais || 0);

    const { data: assinaturaExistente, error: assinaturaError } =
      await supabaseAdmin
        .from("assinaturas")
        .select(`
          id,
          status,
          trial_ativo,
          trial_inicio_em,
          trial_fim_em,
          vencimento_em,
          renovacao_automatica
        `)
        .eq("id_salao", idSalao)
        .maybeSingle();

    if (assinaturaError) {
      return NextResponse.json(
        { error: assinaturaError.message || "Erro ao consultar assinatura." },
        { status: 500 }
      );
    }

    if (assinaturaExistente?.id) {
      const statusAtual = String(assinaturaExistente.status || "").toLowerCase();

      if (
        ["teste_gratis", "trial", "ativo", "ativa", "pago"].includes(statusAtual)
      ) {
        return NextResponse.json({
          ok: true,
          alreadyExists: true,
          status: assinaturaExistente.status,
          vencimento_em: assinaturaExistente.vencimento_em,
          trial_fim_em: assinaturaExistente.trial_fim_em,
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          plano: planoTeste.codigo,
          valor: valorMensal,
          status: "teste_gratis",
          vencimento_em: vencimentoEm,
          limite_profissionais: limiteProfissionais,
          limite_usuarios: limiteUsuarios,
          pago_em: null,
          trial_ativo: true,
          trial_inicio_em: agoraIso,
          trial_fim_em: trialFimIso,
          gateway: null,
          forma_pagamento_atual: null,
          id_cobranca_atual: null,
          referencia_atual: null,
          asaas_payment_id: null,
          renovacao_automatica:
            assinaturaExistente.renovacao_automatica ?? false,
        })
        .eq("id", assinaturaExistente.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "Erro ao atualizar assinatura trial." },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("assinaturas")
        .insert({
          id_salao: idSalao,
          asaas_customer_id: null,
          asaas_payment_id: null,
          plano: planoTeste.codigo,
          valor: valorMensal,
          status: "teste_gratis",
          vencimento_em: vencimentoEm,
          limite_profissionais: limiteProfissionais,
          limite_usuarios: limiteUsuarios,
          pago_em: null,
          trial_ativo: true,
          trial_inicio_em: agoraIso,
          trial_fim_em: trialFimIso,
          forma_pagamento_atual: null,
          id_cobranca_atual: null,
          gateway: null,
          referencia_atual: null,
          renovacao_automatica: false,
        });

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message || "Erro ao criar assinatura trial." },
          { status: 500 }
        );
      }
    }

    const { error: updateSalaoError } = await supabaseAdmin
      .from("saloes")
      .update({
        status: "teste_gratis",
        trial_ativo: true,
        trial_inicio_em: agoraIso,
        trial_fim_em: trialFimIso,
        limite_profissionais: limiteProfissionais,
        limite_usuarios: limiteUsuarios,
      })
      .eq("id", idSalao);

    if (updateSalaoError) {
      return NextResponse.json(
        { error: updateSalaoError.message || "Erro ao atualizar dados do salão." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: "teste_gratis",
      plano: planoTeste.codigo,
      nome_plano: planoTeste.nome,
      vencimento_em: vencimentoEm,
      trial_inicio_em: agoraIso,
      trial_fim_em: trialFimIso,
      limite_usuarios: limiteUsuarios,
      limite_profissionais: limiteProfissionais,
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao iniciar trial.",
      },
      { status: 500 }
    );
  }
}
