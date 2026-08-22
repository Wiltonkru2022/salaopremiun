import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import {
  clearProfissionalSession,
  verifyPassword,
} from "@/lib/profissional-auth.server";
import {
  assertCanCreateAgendaInCurrentMonth,
  assertCanCreateWithinLimit,
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { asLooseSupabaseClient } from "@/lib/supabase/loose-client";

type MutationAction =
  | "criar_agendamento"
  | "criar_cliente"
  | "editar_cliente"
  | "criar_servico"
  | "editar_servico"
  | "trocar_senha"
  | "excluir_avaliacao"
  | "abrir_comanda"
  | "adicionar_item_comanda"
  | "fechar_comanda";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function nullableText(value: unknown) {
  const normalized = text(value);
  return normalized || null;
}

function positiveNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function positiveInteger(value: unknown, fallback = 30) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function resolveTargetProfissional(params: {
  supabase: any;
  requestedId: unknown;
  idProfissional: string;
  idSalao: string;
  podeVerAgendaTodos: boolean;
}) {
  const requested = text(params.requestedId) || params.idProfissional;
  if (requested === params.idProfissional) return requested;

  if (!params.podeVerAgendaTodos) {
    throw new Error("FORBIDDEN_PROFISSIONAL");
  }

  const { data, error } = await params.supabase
    .from("profissionais")
    .select("id")
    .eq("id", requested)
    .eq("id_salao", params.idSalao)
    .eq("ativo", true)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error("FORBIDDEN_PROFISSIONAL");
  }

  return requested;
}

async function assertProfessionalMutationPlanAccess(params: {
  action: MutationAction;
  idSalao: string;
  body: Record<string, unknown>;
}) {
  if (params.action === "criar_agendamento") {
    await assertCanMutatePlanFeature(params.idSalao, "agenda");
    await assertCanCreateAgendaInCurrentMonth(params.idSalao);
    return;
  }

  if (params.action === "criar_cliente") {
    await assertCanMutatePlanFeature(params.idSalao, "clientes");
    await assertCanCreateWithinLimit(params.idSalao, "clientes");
    return;
  }

  if (params.action === "editar_cliente") {
    await assertCanMutatePlanFeature(params.idSalao, "clientes");
    return;
  }

  if (params.action === "criar_servico") {
    await assertCanMutatePlanFeature(params.idSalao, "servicos");
    await assertCanCreateWithinLimit(params.idSalao, "servicos");
    return;
  }

  if (params.action === "editar_servico") {
    await assertCanMutatePlanFeature(params.idSalao, "servicos");
    return;
  }

  if (
    params.action === "abrir_comanda" ||
    params.action === "adicionar_item_comanda" ||
    params.action === "fechar_comanda"
  ) {
    await assertCanMutatePlanFeature(params.idSalao, "comandas");

    if (params.action === "adicionar_item_comanda") {
      const tipo = text(params.body.tipo) || "servico";
      await assertCanMutatePlanFeature(
        params.idSalao,
        tipo === "produto" ? "produtos" : "servicos"
      );
    }
  }
}

export async function POST(request: Request) {
  let shouldClearSession = false;

  try {
    const context = await requireProfissionalAppContext();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = text(body.action) as MutationAction;

    const allowed: MutationAction[] = [
      "criar_agendamento",
      "criar_cliente",
      "editar_cliente",
      "criar_servico",
      "editar_servico",
      "trocar_senha",
      "excluir_avaliacao",
      "abrir_comanda",
      "adicionar_item_comanda",
      "fechar_comanda",
    ];

    if (!allowed.includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Ação inválida." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    await assertProfessionalMutationPlanAccess({
      action,
      idSalao: context.idSalao,
      body,
    });

    const result = await runAdminOperation({
      action: `app_profissional_mutacao_${action}`,
      actorId: context.idProfissional,
      idSalao: context.idSalao,
      run: async (supabase) => {
        const rpc = asLooseSupabaseClient(supabase);

        if (action === "criar_agendamento") {
          const targetProfissionalId = await resolveTargetProfissional({
            supabase,
            requestedId: body.profissionalId,
            idProfissional: context.idProfissional,
            idSalao: context.idSalao,
            podeVerAgendaTodos: context.podeVerAgendaTodos,
          });

          const { data, error } = await rpc.rpc("app_profissional_criar_agendamento", {
            p_profissional_id: targetProfissionalId,
            p_cliente_id: text(body.clienteId),
            p_servico_id: text(body.servicoId),
            p_data: text(body.data),
            p_hora_inicio: text(body.horaInicio),
          });
          if (error) throw error;
          return { id: data ?? null };
        }

        if (action === "criar_cliente") {
          const nome = text(body.nome);
          if (!nome) throw new Error("Nome da cliente é obrigatório.");

          const { data, error } = await rpc.rpc("app_profissional_criar_cliente", {
            p_profissional_id: context.idProfissional,
            p_nome: nome,
            p_telefone: text(body.telefone),
            p_observacoes: text(body.observacoes),
          });
          if (error) throw error;
          return { id: data ?? null };
        }

        if (action === "editar_cliente") {
          const clienteId = text(body.clienteId);
          const nome = text(body.nome);
          if (!clienteId || !nome) throw new Error("Cliente inválida.");

          const { data, error } = await rpc.rpc("app_profissional_editar_cliente", {
            p_profissional_id: context.idProfissional,
            p_cliente_id: clienteId,
            p_nome: nome,
            p_telefone: text(body.telefone),
            p_observacoes: text(body.observacoes),
          });
          if (error) throw error;
          return { updated: data === true };
        }

        if (action === "criar_servico") {
          const nome = text(body.nome);
          if (!nome) throw new Error("Nome do serviço é obrigatório.");

          const { data, error } = await rpc.rpc("app_profissional_criar_servico", {
            p_profissional_id: context.idProfissional,
            p_nome: nome,
            p_preco: positiveNumber(body.preco),
            p_duracao: positiveInteger(body.duracaoMinutos),
          });
          if (error) throw error;

          const servicoId = text(data);
          if (servicoId) {
            const { error: descricaoError } = await (supabase as any)
              .from("servicos")
              .update({
                descricao: nullableText(body.descricao),
                atualizado_em: new Date().toISOString(),
              })
              .eq("id", servicoId)
              .eq("id_salao", context.idSalao);
            if (descricaoError) throw descricaoError;
          }

          return { id: data ?? null };
        }

        if (action === "editar_servico") {
          const servicoId = text(body.servicoId);
          const nome = text(body.nome);
          if (!servicoId || !nome) throw new Error("Serviço inválido.");

          const { data, error } = await rpc.rpc("app_profissional_editar_servico", {
            p_profissional_id: context.idProfissional,
            p_servico_id: servicoId,
            p_nome: nome,
            p_preco: positiveNumber(body.preco),
            p_duracao: positiveInteger(body.duracaoMinutos),
          });
          if (error) throw error;

          const { error: descricaoError } = await (supabase as any)
            .from("servicos")
            .update({
              descricao: nullableText(body.descricao),
              atualizado_em: new Date().toISOString(),
            })
            .eq("id", servicoId)
            .eq("id_salao", context.idSalao);
          if (descricaoError) throw descricaoError;

          return { updated: data === true };
        }

        if (action === "trocar_senha") {
          const senhaAtual = text(body.senhaAtual);
          const senha = text(body.senha);
          if (!senhaAtual) {
            throw new Error("Informe a senha atual.");
          }
          if (senha.length < 6) {
            throw new Error("A nova senha precisa ter pelo menos 6 caracteres.");
          }
          if (senhaAtual === senha) {
            throw new Error("Escolha uma senha diferente da atual.");
          }

          const { data: acesso, error: acessoError } = await (supabase as any)
            .from("profissionais_acessos")
            .select("id, senha_hash")
            .eq("id_profissional", context.idProfissional)
            .eq("ativo", true)
            .limit(1)
            .maybeSingle();
          if (acessoError || !acesso?.senha_hash) {
            throw new Error("Não foi possível validar seu acesso ativo.");
          }

          const senhaAtualOk = await verifyPassword(senhaAtual, acesso.senha_hash);
          if (!senhaAtualOk) {
            throw new Error("Senha atual incorreta.");
          }

          const { data, error } = await rpc.rpc("app_profissional_trocar_senha", {
            p_profissional_id: context.idProfissional,
            p_senha: senha,
          });
          if (error) throw error;
          if (data !== true) throw new Error("Não foi possível alterar a senha.");
          shouldClearSession = true;
          return { reauthenticate: true };
        }

        if (action === "excluir_avaliacao") {
          const avaliacaoId = text(body.avaliacaoId);
          if (!avaliacaoId) throw new Error("Avaliação inválida.");

          const { data, error } = await rpc.rpc("app_profissional_excluir_avaliacao", {
            p_profissional_id: context.idProfissional,
            p_avaliacao_id: avaliacaoId,
          });
          if (error) throw error;
          return { deleted: data === true };
        }

        if (action === "abrir_comanda") {
          const { data, error } = await rpc.rpc("app_profissional_abrir_comanda", {
            p_profissional_id: context.idProfissional,
            p_cliente_id: nullableText(body.clienteId),
            p_cliente_nome: text(body.clienteNome) || "Consumidor Final",
          });
          if (error) throw error;
          return { id: data ?? null };
        }

        if (action === "adicionar_item_comanda") {
          const comandaId = text(body.comandaId);
          const nome = text(body.nome);
          if (!comandaId || !nome) throw new Error("Item da comanda inválido.");

          const { data, error } = await rpc.rpc("app_profissional_adicionar_item_comanda", {
            p_profissional_id: context.idProfissional,
            p_comanda_id: comandaId,
            p_servico_id: nullableText(body.servicoId),
            p_nome: nome,
            p_quantidade: positiveNumber(body.quantidade, 1) || 1,
            p_valor_unitario: positiveNumber(body.valorUnitario),
            p_tipo: text(body.tipo) || "servico",
          });
          if (error) throw error;
          return { id: data ?? null };
        }

        const comandaId = text(body.comandaId);
        if (!comandaId) throw new Error("Comanda inválida.");
        const { data, error } = await rpc.rpc("app_profissional_fechar_comanda", {
          p_profissional_id: context.idProfissional,
          p_comanda_id: comandaId,
        });
        if (error) throw error;
        return { updated: data === true };
      },
    });

    if (shouldClearSession) {
      await clearProfissionalSession();
    }

    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível concluir a operação.";
    const status =
      error instanceof PlanAccessError
        ? error.status
        : message === "FORBIDDEN_PROFISSIONAL"
          ? 403
          : 400;
    return NextResponse.json(
      {
        ok: false,
        error:
          message === "FORBIDDEN_PROFISSIONAL"
            ? "Você não tem permissão para alterar dados de outro profissional."
            : message,
      },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
