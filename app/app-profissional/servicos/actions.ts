"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assertCanCreateWithinLimit,
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { createServicoService } from "@/services/servicoService";

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value || "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function checked(value: FormDataEntryValue | null) {
  return String(value || "") === "on" || String(value || "") === "true";
}

function buildServicosUrl(params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      query.set(key, String(value));
    }
  });

  return `/app-profissional/servicos${query.size ? `?${query.toString()}` : ""}`;
}

function buildEditarUrl(
  idServico: string,
  params: Record<string, string | number | null | undefined>
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      query.set(key, String(value));
    }
  });

  return `/app-profissional/servicos/${idServico}${query.size ? `?${query.toString()}` : ""}`;
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

async function assertServicoVinculado(params: {
  idSalao: string;
  idProfissional: string;
  idServico: string;
}) {
  return runAdminOperation({
    action: "app_profissional_servico_validar_vinculo",
    actorId: params.idProfissional,
    idSalao: params.idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("profissional_servicos")
        .select("id")
        .eq("id_salao", params.idSalao)
        .eq("id_profissional", params.idProfissional)
        .eq("id_servico", params.idServico)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data?.id) throw new Error("Servico nao vinculado a este profissional.");
    },
  });
}

export async function salvarServicoProfissionalAction(formData: FormData) {
  const session = await requireProfissionalAppContext();
  const idServico = String(formData.get("servico_id") || "").trim();
  const nome = String(formData.get("nome") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim();
  const idCategoria = String(formData.get("id_categoria") || "").trim();
  const duracaoMinutos = Math.max(5, Math.round(parseNumber(formData.get("duracao_minutos"), 60)));
  const pausaMinutos = Math.max(0, Math.round(parseNumber(formData.get("pausa_minutos"), 0)));
  const precoPadrao = Math.max(0, parseMoney(formData.get("preco_padrao")));
  const sinalPercentual = Math.max(
    0,
    Math.min(100, parseNumber(formData.get("sinal_percentual_personalizado"), 0))
  );
  const ativo = checked(formData.get("ativo"));
  const appClienteVisivel = checked(formData.get("app_cliente_visivel"));
  const cobraSinal = checked(formData.get("cobra_sinal_agendamento"));

  try {
    if (!nome) throw new Error("Informe o nome do servico.");
    if (!duracaoMinutos) throw new Error("Informe a duracao do servico.");

    await assertCanMutatePlanFeature(session.idSalao, "servicos");
    if (!idServico) {
      await assertCanCreateWithinLimit(session.idSalao, "servicos");
    } else {
      await assertServicoVinculado({
        idSalao: session.idSalao,
        idProfissional: session.idProfissional,
        idServico,
      });
    }

    const savedId = await runAdminOperation({
      action: "app_profissional_servico_salvar",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const payload = {
          id_salao: session.idSalao,
          nome,
          descricao: descricao || null,
          id_categoria: idCategoria || null,
          duracao: duracaoMinutos,
          duracao_minutos: duracaoMinutos,
          pausa_minutos: pausaMinutos,
          preco: precoPadrao,
          preco_padrao: precoPadrao,
          ativo,
          status: ativo ? "ativo" : "inativo",
          app_cliente_visivel: appClienteVisivel,
          cobra_sinal_agendamento: cobraSinal,
          sinal_percentual_personalizado: cobraSinal ? sinalPercentual : null,
          updated_at: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        };

        let serviceId = idServico;

        if (serviceId) {
          const { data, error } = await supabase
            .from("servicos")
            .update(payload)
            .eq("id", serviceId)
            .eq("id_salao", session.idSalao)
            .select("id")
            .maybeSingle();

          if (error) throw new Error(error.message);
          if (!data?.id) throw new Error("Servico nao encontrado.");
        } else {
          const { data, error } = await supabase
            .from("servicos")
            .insert({
              ...payload,
              created_at: new Date().toISOString(),
              criado_em: new Date().toISOString(),
            })
            .select("id")
            .maybeSingle();

          if (error) throw new Error(error.message);
          if (!data?.id) throw new Error("Nao foi possivel criar o servico.");
          serviceId = data.id;
        }

        const { data: vinculoAtual, error: vinculoError } = await supabase
          .from("profissional_servicos")
          .select("id")
          .eq("id_salao", session.idSalao)
          .eq("id_profissional", session.idProfissional)
          .eq("id_servico", serviceId)
          .maybeSingle();

        if (vinculoError) throw new Error(vinculoError.message);

        const vinculoPayload = {
          id_salao: session.idSalao,
          id_profissional: session.idProfissional,
          id_servico: serviceId,
          duracao_minutos: duracaoMinutos,
          ativo: true,
          updated_at: new Date().toISOString(),
        };

        if (vinculoAtual?.id) {
          const { error } = await supabase
            .from("profissional_servicos")
            .update(vinculoPayload)
            .eq("id", vinculoAtual.id)
            .eq("id_salao", session.idSalao);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase
            .from("profissional_servicos")
            .insert({
              ...vinculoPayload,
              created_at: new Date().toISOString(),
            });
          if (error) throw new Error(error.message);
        }

        return serviceId;
      },
    });

    revalidatePath("/app-profissional/servicos");
    revalidatePath(`/app-profissional/servicos/${savedId}`);
    revalidatePath("/app-profissional/agenda/novo");
    revalidatePath("/app-cliente");

    redirect(buildEditarUrl(savedId, { ok: "Servico salvo com sucesso." }));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao salvar servico.";

    if (idServico) {
      redirect(buildEditarUrl(idServico, { erro: message }));
    }
    redirect(buildServicosUrl({ erro: message }));
  }
}

export async function excluirServicoProfissionalAction(formData: FormData) {
  const session = await requireProfissionalAppContext();
  const idServico = String(formData.get("servico_id") || "").trim();

  try {
    if (!idServico) throw new Error("Servico invalido.");
    await assertCanMutatePlanFeature(session.idSalao, "servicos");
    await assertServicoVinculado({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      idServico,
    });

    const vinculos = await runAdminOperation({
      action: "app_profissional_servico_verificar_vinculos",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const [agendamentosResult, comandaItensResult] = await Promise.all([
          supabase
            .from("agendamentos")
            .select("id", { count: "exact", head: true })
            .eq("id_salao", session.idSalao)
            .eq("servico_id", idServico),
          supabase
            .from("comanda_itens")
            .select("id", { count: "exact", head: true })
            .eq("id_salao", session.idSalao)
            .eq("id_servico", idServico),
        ]);

        if (agendamentosResult.error) throw new Error(agendamentosResult.error.message);
        if (comandaItensResult.error) throw new Error(comandaItensResult.error.message);

        return {
          agendamentos: agendamentosResult.count || 0,
          comandaItens: comandaItensResult.count || 0,
        };
      },
    });

    if (vinculos.agendamentos > 0 || vinculos.comandaItens > 0) {
      throw new Error(
        "Este servico ja possui agendamentos ou comandas. Para preservar o historico, ele nao pode ser excluido; deixe inativo se nao quiser vender mais."
      );
    }

    await createServicoService().excluir({
      idSalao: session.idSalao,
      idServico,
    });

    revalidatePath("/app-profissional/servicos");
    revalidatePath("/app-profissional/agenda/novo");
    revalidatePath("/app-cliente");

    redirect(buildServicosUrl({ ok: "Servico excluido com sucesso." }));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao excluir servico.";

    redirect(buildEditarUrl(idServico || "invalido", { erro: message }));
  }
}
