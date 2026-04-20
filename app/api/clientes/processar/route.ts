import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  ClienteAuthPayload,
  ClienteAutorizacoesPayload,
  ClienteFichaPayload,
  ClientePayload,
  ClientePreferenciasPayload,
  ClienteProcessarBody,
} from "@/types/clientes";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

function sanitizeText(value: unknown) {
  const parsed = String(value || "").trim();
  return parsed || null;
}

function normalizeEmail(value: unknown) {
  const parsed = String(value || "").trim().toLowerCase();
  return parsed || null;
}

function normalizePhone(value: unknown) {
  const parsed = String(value || "").replace(/\D/g, "");
  return parsed || null;
}

function sanitizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return fallback;
}

function resolveHttpStatus(error: unknown) {
  const candidate = error as { code?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23505") return 409;
  if (candidate.code === "23514") return 409;
  return 500;
}

function buildClientePayload(idSalao: string, cliente: ClientePayload) {
  const nome = sanitizeText(cliente.nome);
  if (!nome) {
    throw new Error("Informe o nome da cliente.");
  }

  const ativo = sanitizeBoolean(cliente.ativo, true);

  return {
    id_salao: idSalao,
    nome,
    nome_social: sanitizeText(cliente.nome_social),
    data_nascimento: sanitizeText(cliente.data_nascimento),
    whatsapp: sanitizeText(cliente.whatsapp),
    telefone: sanitizeText(cliente.telefone),
    email: normalizeEmail(cliente.email),
    cpf: sanitizeText(cliente.cpf),
    endereco: sanitizeText(cliente.endereco),
    numero: sanitizeText(cliente.numero),
    bairro: sanitizeText(cliente.bairro),
    cidade: sanitizeText(cliente.cidade),
    estado: sanitizeText(cliente.estado),
    cep: sanitizeText(cliente.cep),
    profissao: sanitizeText(cliente.profissao),
    observacoes: sanitizeText(cliente.observacoes),
    foto_url: sanitizeText(cliente.foto_url),
    ativo,
    status: ativo ? "ativo" : "inativo",
  };
}

async function assertNoDuplicateCliente(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idClienteAtual?: string | null;
  payloadCliente: ReturnType<typeof buildClientePayload>;
}) {
  const { supabaseAdmin, idSalao, idClienteAtual, payloadCliente } = params;
  const email = normalizeEmail(payloadCliente.email);
  const whatsapp = normalizePhone(payloadCliente.whatsapp);
  const telefone = normalizePhone(payloadCliente.telefone);
  const cpf = normalizePhone(payloadCliente.cpf);

  if (email) {
    const { data, error } = await supabaseAdmin
      .from("clientes")
      .select("id, nome, email")
      .eq("id_salao", idSalao)
      .eq("email", email);

    if (error) throw error;

    const duplicado = (data || []).find((item) => item.id !== idClienteAtual);
    if (duplicado) {
      throw new Error(
        `Ja existe cliente com este e-mail: ${duplicado.nome || "cadastro existente"}.`
      );
    }
  }

  if (!whatsapp && !telefone && !cpf) return;

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, whatsapp, telefone, cpf")
    .eq("id_salao", idSalao);

  if (error) throw error;

  const duplicadoContato = (data || []).find((item) => {
    if (item.id === idClienteAtual) return false;
    const itemWhatsapp = normalizePhone(item.whatsapp);
    const itemTelefone = normalizePhone(item.telefone);
    const itemCpf = normalizePhone(item.cpf);

    return Boolean(
      (whatsapp && (whatsapp === itemWhatsapp || whatsapp === itemTelefone)) ||
        (telefone && (telefone === itemTelefone || telefone === itemWhatsapp)) ||
        (cpf && cpf === itemCpf)
    );
  });

  if (duplicadoContato) {
    throw new Error(
      `Ja existe cliente com contato ou CPF parecido: ${duplicadoContato.nome || "cadastro existente"}.`
    );
  }
}

async function assertClientePodeSerExcluido(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idCliente: string;
}) {
  const { supabaseAdmin, idSalao, idCliente } = params;

  const [
    { count: agendamentosCount, error: agendamentosError },
    { count: comandasCount, error: comandasError },
  ] = await Promise.all([
    supabaseAdmin
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", idSalao)
      .eq("cliente_id", idCliente),
    supabaseAdmin
      .from("comandas")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", idSalao)
      .eq("id_cliente", idCliente),
  ]);

  if (agendamentosError) throw agendamentosError;
  if (comandasError) throw comandasError;

  if ((agendamentosCount || 0) > 0) {
    throw new Error(
      "Esta cliente ja possui historico de agenda. Inative o cadastro em vez de excluir."
    );
  }

  if ((comandasCount || 0) > 0) {
    throw new Error(
      "Esta cliente ja possui historico de comanda. Inative o cadastro em vez de excluir."
    );
  }
}

function buildFichaPayload(
  idSalao: string,
  idCliente: string,
  ficha: ClienteFichaPayload | null | undefined
) {
  return {
    id_salao: idSalao,
    id_cliente: idCliente,
    alergias: sanitizeText(ficha?.alergias),
    historico_quimico: sanitizeText(ficha?.historico_quimico),
    condicoes_couro_cabeludo_pele: sanitizeText(
      ficha?.condicoes_couro_cabeludo_pele
    ),
    uso_medicamentos: sanitizeText(ficha?.uso_medicamentos),
    gestante: sanitizeBoolean(ficha?.gestante, false),
    lactante: sanitizeBoolean(ficha?.lactante, false),
    restricoes_quimicas: sanitizeText(ficha?.restricoes_quimicas),
    observacoes_tecnicas: sanitizeText(ficha?.observacoes_tecnicas),
  };
}

function buildPreferenciasPayload(
  idSalao: string,
  idCliente: string,
  preferencias: ClientePreferenciasPayload | null | undefined
) {
  return {
    id_salao: idSalao,
    id_cliente: idCliente,
    bebida_favorita: sanitizeText(preferencias?.bebida_favorita),
    estilo_atendimento: sanitizeText(preferencias?.estilo_atendimento),
    revistas_assuntos_preferidos: sanitizeText(
      preferencias?.revistas_assuntos_preferidos
    ),
    como_conheceu_salao: sanitizeText(preferencias?.como_conheceu_salao),
    profissional_favorito_id: sanitizeUuid(
      preferencias?.profissional_favorito_id
    ),
    frequencia_visitas: sanitizeText(preferencias?.frequencia_visitas),
    preferencias_gerais: sanitizeText(preferencias?.preferencias_gerais),
  };
}

function buildAutorizacoesPayload(
  idSalao: string,
  idCliente: string,
  autorizacoes: ClienteAutorizacoesPayload | null | undefined
) {
  const termoLgpdAceito = sanitizeBoolean(
    autorizacoes?.termo_lgpd_aceito,
    false
  );

  return {
    id_salao: idSalao,
    id_cliente: idCliente,
    autoriza_uso_imagem: sanitizeBoolean(
      autorizacoes?.autoriza_uso_imagem,
      false
    ),
    autoriza_whatsapp_marketing: sanitizeBoolean(
      autorizacoes?.autoriza_whatsapp_marketing,
      false
    ),
    autoriza_email_marketing: sanitizeBoolean(
      autorizacoes?.autoriza_email_marketing,
      false
    ),
    termo_lgpd_aceito: termoLgpdAceito,
    data_aceite_lgpd: termoLgpdAceito
      ? sanitizeText(autorizacoes?.data_aceite_lgpd) || new Date().toISOString()
      : null,
    observacoes_autorizacao: sanitizeText(
      autorizacoes?.observacoes_autorizacao
    ),
  };
}

function buildAuthPayload(
  idSalao: string,
  idCliente: string,
  auth: ClienteAuthPayload | null | undefined,
  fallbackEmail: string | null
) {
  return {
    id_salao: idSalao,
    id_cliente: idCliente,
    email: sanitizeText(auth?.email) || fallbackEmail,
    senha_hash: sanitizeText(auth?.senha_hash),
    app_ativo: sanitizeBoolean(auth?.app_ativo, false),
  };
}

async function upsertByCliente(params: {
  table:
    | "clientes_ficha_tecnica"
    | "clientes_preferencias"
    | "clientes_autorizacoes"
    | "clientes_auth";
  payload: Record<string, unknown>;
  idCliente: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: existing, error: findError } = await supabaseAdmin
    .from(params.table)
    .select("id")
    .eq("id_cliente", params.idCliente)
    .limit(1);

  if (findError) {
    throw findError;
  }

  if (existing?.[0]?.id) {
    const { error } = await supabaseAdmin
      .from(params.table)
      .update(params.payload)
      .eq("id_cliente", params.idCliente);

    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin.from(params.table).insert(params.payload);
  if (error) throw error;
}

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acaoRaw = "";

  try {
    const body = (await req.json()) as ClienteProcessarBody;
    idSalao = sanitizeUuid(body.idSalao) || "";
    acaoRaw = String(body.acao || "").trim().toLowerCase();
    const acao = acaoRaw;
    const cliente = body.cliente;

    if (!idSalao) {
      return NextResponse.json({ error: "Salao obrigatorio." }, { status: 400 });
    }

    if (!["salvar", "alterar_status", "excluir"].includes(acao)) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    await requireSalaoPermission(idSalao, "clientes_ver", {
      allowedNiveis: ["admin", "gerente"],
    });
    await assertCanMutatePlanFeature(idSalao, "clientes");

    const supabaseAdmin = getSupabaseAdmin();

    if (acao === "salvar") {
      if (!cliente) {
        return NextResponse.json(
          { error: "Cliente obrigatorio para salvar." },
          { status: 400 }
        );
      }

      const payloadCliente = buildClientePayload(idSalao, cliente);
      const idClienteAtual = sanitizeUuid(cliente.id);
      let idCliente = idClienteAtual;

      await assertNoDuplicateCliente({
        supabaseAdmin,
        idSalao,
        idClienteAtual,
        payloadCliente,
      });

      if (idClienteAtual) {
        const { data, error } = await supabaseAdmin
          .from("clientes")
          .update(payloadCliente)
          .eq("id", idClienteAtual)
          .eq("id_salao", idSalao)
          .select("id")
          .maybeSingle();

        if (error) {
          return NextResponse.json(
            { error: error.message || "Erro ao atualizar cliente." },
            { status: resolveHttpStatus(error) }
          );
        }

        if (!data?.id) {
          return NextResponse.json(
            { error: "Cliente nao encontrado para atualizacao." },
            { status: 404 }
          );
        }

        idCliente = data.id;
      } else {
        const { data, error } = await supabaseAdmin
          .from("clientes")
          .insert(payloadCliente)
          .select("id")
          .maybeSingle();

        if (error) {
          return NextResponse.json(
            { error: error.message || "Erro ao criar cliente." },
            { status: resolveHttpStatus(error) }
          );
        }

        idCliente = data?.id || null;
      }

      if (!idCliente) {
        throw new Error("Nao foi possivel obter o ID da cliente.");
      }

      await upsertByCliente({
        table: "clientes_ficha_tecnica",
        payload: buildFichaPayload(idSalao, idCliente, body.ficha),
        idCliente,
      });

      await upsertByCliente({
        table: "clientes_preferencias",
        payload: buildPreferenciasPayload(idSalao, idCliente, body.preferencias),
        idCliente,
      });

      await upsertByCliente({
        table: "clientes_autorizacoes",
        payload: buildAutorizacoesPayload(idSalao, idCliente, body.autorizacoes),
        idCliente,
      });

      await upsertByCliente({
        table: "clientes_auth",
        payload: buildAuthPayload(
          idSalao,
          idCliente,
          body.auth,
          sanitizeText(payloadCliente.email)
        ),
        idCliente,
      });

      return NextResponse.json({
        ok: true,
        idCliente,
      });
    }

    const idCliente = sanitizeUuid(cliente?.id);

    if (!idCliente) {
      return NextResponse.json(
        { error: "Cliente obrigatorio para esta acao." },
        { status: 400 }
      );
    }

    if (acao === "alterar_status") {
      const ativo = sanitizeBoolean(cliente?.ativo, true);
      const { data, error } = await supabaseAdmin
        .from("clientes")
        .update({
          ativo,
          status: ativo ? "ativo" : "inativo",
        })
        .eq("id", idCliente)
        .eq("id_salao", idSalao)
        .select("id, ativo, status")
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: error.message || "Erro ao alterar status da cliente." },
          { status: resolveHttpStatus(error) }
        );
      }

      if (!data?.id) {
        return NextResponse.json(
          { error: "Cliente nao encontrada para alterar status." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        idCliente: data.id,
        ativo: data.ativo,
        status: data.status,
      });
    }

    await assertClientePodeSerExcluido({
      supabaseAdmin,
      idSalao,
      idCliente,
    });

    await Promise.all([
      supabaseAdmin.from("clientes_ficha_tecnica").delete().eq("id_cliente", idCliente),
      supabaseAdmin.from("clientes_preferencias").delete().eq("id_cliente", idCliente),
      supabaseAdmin.from("clientes_autorizacoes").delete().eq("id_cliente", idCliente),
      supabaseAdmin.from("clientes_auth").delete().eq("id_cliente", idCliente),
      supabaseAdmin.from("clientes_historico").delete().eq("id_cliente", idCliente),
    ]);

    const { error } = await supabaseAdmin
      .from("clientes")
      .delete()
      .eq("id", idCliente)
      .eq("id_salao", idSalao);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao excluir cliente." },
        { status: resolveHttpStatus(error) }
      );
    }

    return NextResponse.json({ ok: true, idCliente });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof PlanAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (idSalao) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `clientes:processar:${acaoRaw || "desconhecida"}:${idSalao}`,
          module: "clientes",
          title: "Processamento de cliente falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro interno ao processar cliente.",
          severity: "alta",
          idSalao,
          details: {
            acao: acaoRaw || null,
            route: "/api/clientes/processar",
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de clientes:",
          incidentError
        );
      }
    }

    console.error("Erro geral ao processar cliente:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar cliente.",
      },
      { status: 500 }
    );
  }
}
