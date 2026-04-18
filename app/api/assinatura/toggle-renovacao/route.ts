import { NextResponse } from "next/server";
import { addDays, format, isBefore } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getRenovacaoAutomaticaInfo } from "@/lib/assinaturas/renovacao-automatica";
import {
  createAsaasSubscription,
  isAsaasSubscriptionNotFoundError,
  removeAsaasSubscription,
} from "@/lib/payments/asaas-subscriptions";

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
    throw new HttpError(
      "Somente administrador pode alterar a renovação automática.",
      403
    );
  }
}

async function getRemoteIp() {
  const requestHeaders = await headers();

  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = requestHeaders.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = requestHeaders.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

function getRecurringNextDueDate(vencimentoEm?: string | null) {
  const normalized = String(vencimentoEm || "").trim();

  if (normalized) {
    const dueDate = new Date(`${normalized}T12:00:00`);
    if (!Number.isNaN(dueDate.getTime()) && !isBefore(dueDate, new Date())) {
      return normalized;
    }
  }

  return format(addDays(new Date(), 30), "yyyy-MM-dd");
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();

    const idSalao = String(body?.idSalao || "").trim();
    const renovacaoAutomaticaInput = body?.renovacaoAutomatica;

    if (!idSalao) {
      return NextResponse.json(
        { error: "idSalao é obrigatório." },
        { status: 400 }
      );
    }

    if (typeof renovacaoAutomaticaInput !== "boolean") {
      return NextResponse.json(
        { error: "renovacaoAutomatica deve ser booleano." },
        { status: 400 }
      );
    }

    const renovacaoAutomatica = renovacaoAutomaticaInput;

    await validarSalaoDoUsuario(idSalao);

    const { data: assinatura, error: assinaturaError } = await supabaseAdmin
      .from("assinaturas")
      .select(
        "id, plano, valor, vencimento_em, renovacao_automatica, forma_pagamento_atual, asaas_customer_id, asaas_credit_card_token, asaas_subscription_id, asaas_subscription_status"
      )
      .eq("id_salao", idSalao)
      .maybeSingle();

    if (assinaturaError) {
      return NextResponse.json(
        { error: assinaturaError.message || "Erro ao consultar assinatura." },
        { status: 500 }
      );
    }

    if (!assinatura?.id) {
      return NextResponse.json(
        { error: "Assinatura não encontrada." },
        { status: 404 }
      );
    }

    const renovacaoInfo = getRenovacaoAutomaticaInfo({
      assinaturaExiste: Boolean(assinatura.id),
      asaasCustomerId: assinatura.asaas_customer_id,
      formaPagamentoAtual: assinatura.forma_pagamento_atual,
      renovacaoAutomatica,
      asaasCreditCardToken: assinatura.asaas_credit_card_token,
      asaasSubscriptionId: assinatura.asaas_subscription_id,
    });

    if (renovacaoAutomatica && renovacaoInfo.erroAtivacao) {
      return NextResponse.json(
        {
          error: renovacaoInfo.erroAtivacao,
        },
        { status: 400 }
      );
    }

    const formaPagamentoAtual = String(
      assinatura.forma_pagamento_atual || ""
    ).toUpperCase();
    const asaasSubscriptionId =
      String(assinatura.asaas_subscription_id || "").trim() || null;

    if (renovacaoAutomatica && formaPagamentoAtual === "CREDIT_CARD") {
      if (!asaasSubscriptionId) {
        const assinaturaValor = Number(assinatura.valor || 0);

        if (assinaturaValor <= 0) {
          return NextResponse.json(
            {
              error:
                "Nao foi possivel identificar o valor da assinatura para provisionar a recorrencia no cartao.",
            },
            { status: 400 }
          );
        }

        const remoteIp = await getRemoteIp();
        const recurring = await createAsaasSubscription({
          customerId: String(assinatura.asaas_customer_id || "").trim(),
          billingType: "CREDIT_CARD",
          value: assinaturaValor,
          nextDueDate: getRecurringNextDueDate(assinatura.vencimento_em),
          description: `Assinatura ${String(assinatura.plano || "salaopremium").toUpperCase()} - SalaoPremium`,
          externalReference: idSalao,
          creditCardToken: String(assinatura.asaas_credit_card_token || "").trim(),
          remoteIp,
        });

        const subscriptionId = String(recurring.id || "").trim();

        if (!subscriptionId) {
          return NextResponse.json(
            {
              error:
                "Nao foi possivel provisionar a assinatura recorrente no Asaas.",
            },
            { status: 502 }
          );
        }

        const { error: provisionError } = await supabaseAdmin
          .from("assinaturas")
          .update({
            asaas_subscription_id: subscriptionId,
            asaas_subscription_status:
              String(recurring.status || "").trim() || "ACTIVE",
          })
          .eq("id", assinatura.id);

        if (provisionError) {
          return NextResponse.json(
            {
              error:
                provisionError.message ||
                "Erro ao salvar assinatura recorrente do cartao.",
            },
            { status: 500 }
          );
        }
      }
    }

    if (!renovacaoAutomatica && asaasSubscriptionId) {
      try {
        await removeAsaasSubscription(asaasSubscriptionId);
      } catch (error) {
        if (!isAsaasSubscriptionNotFoundError(error)) {
          throw error;
        }
      }

      const { error: cleanupError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          asaas_subscription_id: null,
          asaas_subscription_status: null,
        })
        .eq("id", assinatura.id);

      if (cleanupError) {
        return NextResponse.json(
          {
            error:
              cleanupError.message ||
              "Erro ao limpar assinatura recorrente do cartao.",
          },
          { status: 500 }
        );
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("assinaturas")
      .update({
        renovacao_automatica: renovacaoAutomatica,
      })
      .eq("id", assinatura.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Erro ao atualizar renovação automática." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      renovacao_automatica: renovacaoAutomatica,
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
            : "Erro interno ao alterar renovação automática.",
      },
      { status: 500 }
    );
  }
}
