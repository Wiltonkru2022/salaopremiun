"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import {
  buscarVinculoProfissionalServico,
  criarCamposAplicacaoComissao,
  resolverRegraComissaoServico,
} from "@/lib/comissoes/regrasServico";
import { registrarLogSistema } from "@/lib/system-logs";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

function sanitizeIdempotencyKey(value: unknown) {
  const parsed = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 160);

  return parsed || null;
}

function sanitizeQuantidade(value: unknown) {
  const parsed = Number(value || 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function sanitizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function formatQuantidade(value: unknown) {
  const numero = Number(value || 0);
  return numero.toFixed(3);
}

function buildActionKey(params: {
  prefix: string;
  idComanda: string;
  idProfissional: string;
  idReferencia: string;
  quantidade?: number;
  formKey?: string | null;
}) {
  return sanitizeIdempotencyKey(
    [
      "app-profissional",
      params.prefix,
      params.idComanda,
      params.idProfissional,
      params.idReferencia,
      params.quantidade ? String(params.quantidade) : null,
      params.formKey || null,
    ]
      .filter(Boolean)
      .join(":")
  );
}

function buildRedirectUrl(idComanda: string, key: "ok" | "erro", value: string) {
  return `/app-profissional/comandas/${idComanda}?${key}=${encodeURIComponent(
    value
  )}`;
}

async function buscarComandaPermitida(idComanda: string) {
  const safeIdComanda = sanitizeUuid(idComanda);

  if (!safeIdComanda) {
    throw new Error("Comanda invalida.");
  }

  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: comanda, error: comandaError } = await supabaseAdmin
    .from("comandas")
    .select("id, id_salao, id_cliente, status, observacoes, subtotal, desconto, acrescimo, total")
    .eq("id", safeIdComanda)
    .eq("id_salao", session.idSalao)
    .maybeSingle();

  if (comandaError || !comanda) {
    throw new Error("Comanda não encontrada.");
  }

  const { count, error: acessoError } = await supabaseAdmin
    .from("agendamentos")
    .select("*", { count: "exact", head: true })
    .eq("id_salao", session.idSalao)
    .eq("profissional_id", session.idProfissional)
    .eq("id_comanda", safeIdComanda);

  if (acessoError) {
    throw new Error("Erro ao validar acesso à comanda.");
  }

  if (!count) {
    throw new Error("Você não tem acesso a esta comanda.");
  }

  return { session, comanda };
}

async function recalcularTotaisComanda(idComanda: string, idSalao: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: comandaAtual, error: comandaAtualError } = await supabaseAdmin
    .from("comandas")
    .select("desconto, acrescimo")
    .eq("id", idComanda)
    .eq("id_salao", idSalao)
    .single();

  if (comandaAtualError || !comandaAtual) {
    throw new Error("Erro ao carregar totais da comanda.");
  }

  const desconto = Number(comandaAtual.desconto || 0);
  const acrescimo = Number(comandaAtual.acrescimo || 0);

  const { error: updateError } = await supabaseAdmin.rpc(
    "fn_recalcular_total_comanda",
    {
      p_id_comanda: idComanda,
      p_desconto: desconto,
      p_acrescimo: acrescimo,
    }
  );

  if (updateError) {
    throw new Error("Erro ao atualizar totais da comanda.");
  }
}

function revalidarComandaProfissional(idComanda: string) {
  revalidatePath(`/app-profissional/comandas/${idComanda}`);
  revalidatePath("/app-profissional/comandas");
  revalidatePath("/app-profissional/inicio");
  revalidatePath(`/comandas/${idComanda}`);
  revalidatePath("/comandas");
}

export async function adicionarServicoNaComandaAction(formData: FormData) {
  const idComanda = String(formData.get("id_comanda") || "");
  const idServico = sanitizeUuid(formData.get("id_servico"));
  const quantidade = sanitizeQuantidade(formData.get("quantidade"));
  const formKey = sanitizeIdempotencyKey(formData.get("idempotency_key"));

  let redirectUrl = buildRedirectUrl(
    idComanda,
    "ok",
    "Serviço adicionado com sucesso."
  );

  try {
    const { session, comanda } = await buscarComandaPermitida(idComanda);
    const supabaseAdmin = getSupabaseAdmin();

    if (String(comanda.status).toLowerCase() !== "aberta") {
      redirectUrl = buildRedirectUrl(
        idComanda,
        "erro",
        "Comanda fechada não permite alterações."
      );
    } else if (!idServico) {
      redirectUrl = buildRedirectUrl(idComanda, "erro", "Selecione um serviço.");
    } else {
      const [
        { data: servico, error: servicoError },
        { data: profissional, error: profissionalError },
      ] = await Promise.all([
        supabaseAdmin
          .from("servicos")
          .select(
            "id, nome, preco, preco_padrao, custo_produto, comissao_percentual, comissao_percentual_padrao, comissao_assistente_percentual, base_calculo, desconta_taxa_maquininha, ativo, status"
          )
          .eq("id", idServico)
          .eq("id_salao", session.idSalao)
          .maybeSingle(),
        supabaseAdmin
          .from("profissionais")
          .select("id, nome, comissao_percentual, comissao")
          .eq("id", session.idProfissional)
          .eq("id_salao", session.idSalao)
          .maybeSingle(),
      ]);

      if (servicoError || !servico) {
        redirectUrl = buildRedirectUrl(
          idComanda,
          "erro",
          "Serviço não encontrado."
        );
      } else if (profissionalError || !profissional) {
        redirectUrl = buildRedirectUrl(
          idComanda,
          "erro",
          "Profissional nao encontrado."
        );
      } else if (!servico.ativo || servico.status !== "ativo") {
        redirectUrl = buildRedirectUrl(idComanda, "erro", "Serviço inativo.");
      } else {
        const vinculo = await buscarVinculoProfissionalServico({
          supabase: supabaseAdmin,
          idProfissional: session.idProfissional,
          idServico,
        });
        const regra = resolverRegraComissaoServico({
          servico,
          profissional,
          vinculo,
        });
        const camposComissao = criarCamposAplicacaoComissao(regra);
        const itemIdempotencyKey = buildActionKey({
          prefix: "servico",
          idComanda,
          idProfissional: session.idProfissional,
          idReferencia: idServico,
          quantidade,
          formKey,
        });

        const { data: itemResult, error: insertError } = await supabaseAdmin.rpc(
          "fn_adicionar_item_comanda_idempotente",
          {
            p_id_salao: session.idSalao,
            p_id_comanda: idComanda,
            p_tipo_item: "servico",
            p_id_agendamento: null,
            p_id_servico: idServico,
            p_id_produto: null,
            p_descricao: servico.nome || "Servico",
            p_quantidade: quantidade,
            p_valor_unitario: regra.valorUnitario,
            p_custo_total: sanitizeMoney(servico.custo_produto),
            p_id_profissional: session.idProfissional,
            p_id_assistente: null,
            p_comissao_percentual:
              camposComissao.comissao_percentual_aplicada,
            p_comissao_assistente_percentual:
              camposComissao.comissao_assistente_percentual_aplicada,
            p_base_calculo: camposComissao.base_calculo_aplicada,
            p_desconta_taxa_maquininha:
              camposComissao.desconta_taxa_maquininha_aplicada,
            p_origem: "app_profissional",
            p_observacoes: null,
            p_desconto: sanitizeMoney(comanda.desconto),
            p_acrescimo: sanitizeMoney(comanda.acrescimo),
            p_idempotency_key: itemIdempotencyKey,
          }
        );

        if (insertError) {
          redirectUrl = buildRedirectUrl(
            idComanda,
            "erro",
            insertError.message || "Erro ao adicionar serviço."
          );
        } else {
          const resultRow = Array.isArray(itemResult) ? itemResult[0] : null;
          const jaExistia =
            resultRow &&
            typeof resultRow === "object" &&
            "ja_existia" in resultRow
              ? Boolean(resultRow.ja_existia)
              : false;

          await registrarLogSistema({
            gravidade: jaExistia ? "warning" : "info",
            modulo: "app_profissional",
            idSalao: session.idSalao,
            mensagem: jaExistia
              ? "Servico da comanda reaproveitado por idempotencia no app profissional."
              : "Servico adicionado na comanda pelo app profissional.",
            detalhes: {
              acao: "adicionar_servico",
              id_comanda: idComanda,
              id_servico: idServico,
              id_profissional: session.idProfissional,
              quantidade,
              idempotency_key: itemIdempotencyKey,
              ja_existia: jaExistia,
            },
          });
          revalidarComandaProfissional(idComanda);
        }
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao adicionar serviço.";
    redirectUrl = buildRedirectUrl(idComanda, "erro", message);
  }

  redirect(redirectUrl);
}

export async function adicionarExtraNaComandaAction(formData: FormData) {
  const idComanda = String(formData.get("id_comanda") || "");
  const idItemExtra = sanitizeUuid(formData.get("id_item_extra"));
  const quantidade = sanitizeQuantidade(formData.get("quantidade"));
  const formKey = sanitizeIdempotencyKey(formData.get("idempotency_key"));

  let redirectUrl = buildRedirectUrl(
    idComanda,
    "ok",
    "Item extra adicionado com sucesso."
  );

  try {
    const { session, comanda } = await buscarComandaPermitida(idComanda);
    const supabaseAdmin = getSupabaseAdmin();

    if (String(comanda.status).toLowerCase() !== "aberta") {
      redirectUrl = buildRedirectUrl(
        idComanda,
        "erro",
        "Comanda fechada não permite alterações."
      );
    } else if (!idItemExtra) {
      redirectUrl = buildRedirectUrl(
        idComanda,
        "erro",
        "Selecione um item extra."
      );
    } else {
      const { data: extra, error: extraError } = await supabaseAdmin
        .from("itens_extras")
        .select("id, nome, preco_venda, ativo")
        .eq("id", idItemExtra)
        .eq("id_salao", session.idSalao)
        .maybeSingle();

      if (extraError || !extra) {
        redirectUrl = buildRedirectUrl(
          idComanda,
          "erro",
          "Item extra não encontrado."
        );
      } else if (!extra.ativo) {
        redirectUrl = buildRedirectUrl(idComanda, "erro", "Item extra inativo.");
      } else {
        const valorUnitario = Number(extra.preco_venda || 0);
        const valorTotal = sanitizeMoney(valorUnitario * quantidade);
        const itemIdempotencyKey = buildActionKey({
          prefix: "extra",
          idComanda,
          idProfissional: session.idProfissional,
          idReferencia: idItemExtra,
          quantidade,
          formKey,
        });
        let jaExistia = false;
        let insertError: { code?: string; message?: string } | null = null;

        const { data: itemExistente } = itemIdempotencyKey
          ? await supabaseAdmin
              .from("comanda_itens")
              .select("id")
              .eq("id_salao", session.idSalao)
              .eq("idempotency_key", itemIdempotencyKey)
              .maybeSingle()
          : { data: null };

        if (itemExistente?.id) {
          jaExistia = true;
        } else {
          const insertResult = await supabaseAdmin.from("comanda_itens").insert({
            id_salao: session.idSalao,
            id_comanda: idComanda,
            tipo_item: "extra",
            tipo: null,
            id_item_extra: extra.id,
            descricao: extra.nome,
            quantidade: formatQuantidade(quantidade),
            valor_unitario: valorUnitario,
            valor_total: valorTotal,
            custo_total: 0,
            id_profissional: session.idProfissional,
            origem: "app_profissional",
            ativo: true,
            idempotency_key: itemIdempotencyKey,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          insertError = insertResult.error;

          if (insertError?.code === "23505" && itemIdempotencyKey) {
            jaExistia = true;
            insertError = null;
          }
        }

        if (insertError) {
          redirectUrl = buildRedirectUrl(
            idComanda,
            "erro",
            insertError.message || "Erro ao adicionar item extra."
          );
        } else {
          await recalcularTotaisComanda(idComanda, session.idSalao);
          await registrarLogSistema({
            gravidade: jaExistia ? "warning" : "info",
            modulo: "app_profissional",
            idSalao: session.idSalao,
            mensagem: jaExistia
              ? "Item extra da comanda reaproveitado por idempotencia no app profissional."
              : "Item extra adicionado na comanda pelo app profissional.",
            detalhes: {
              acao: "adicionar_extra",
              id_comanda: idComanda,
              id_item_extra: idItemExtra,
              id_profissional: session.idProfissional,
              quantidade,
              idempotency_key: itemIdempotencyKey,
              ja_existia: jaExistia,
            },
          });
          revalidarComandaProfissional(idComanda);
        }
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao adicionar item extra.";
    redirectUrl = buildRedirectUrl(idComanda, "erro", message);
  }

  redirect(redirectUrl);
}

export async function excluirItemDaComandaAction(formData: FormData) {
  const idComanda = String(formData.get("id_comanda") || "");
  const idItem = sanitizeUuid(formData.get("id_item"));

  let redirectUrl = buildRedirectUrl(
    idComanda,
    "ok",
    "Item removido com sucesso."
  );

  try {
    const { session, comanda } = await buscarComandaPermitida(idComanda);
    const supabaseAdmin = getSupabaseAdmin();

    if (String(comanda.status).toLowerCase() !== "aberta") {
      redirectUrl = buildRedirectUrl(
        idComanda,
        "erro",
        "Comanda fechada não permite alterações."
      );
    } else if (!idItem) {
      redirectUrl = buildRedirectUrl(
        idComanda,
        "erro",
        "Item invalido ou nao encontrado."
      );
    } else {
      const { data: item, error: itemError } = await supabaseAdmin
        .from("comanda_itens")
        .select("id, id_comanda, id_salao, ativo")
        .eq("id", idItem)
        .eq("id_comanda", idComanda)
        .eq("id_salao", session.idSalao)
        .eq("ativo", true)
        .maybeSingle();

      if (itemError) {
        redirectUrl = buildRedirectUrl(
          idComanda,
          "erro",
          itemError.message || "Erro ao localizar item."
        );
      } else if (!item) {
        redirectUrl = buildRedirectUrl(
          idComanda,
          "erro",
          "Item não encontrado ou já removido."
        );
      } else {
        const { error: updateError } = await supabaseAdmin.rpc(
          "fn_remover_item_comanda",
          {
            p_id_salao: session.idSalao,
            p_id_comanda: idComanda,
            p_id_item: idItem,
            p_desconto: sanitizeMoney(comanda.desconto),
            p_acrescimo: sanitizeMoney(comanda.acrescimo),
          }
        );

        if (updateError) {
          redirectUrl = buildRedirectUrl(
            idComanda,
            "erro",
            updateError.message || "Erro ao excluir item."
          );
        } else {
          await registrarLogSistema({
            gravidade: "warning",
            modulo: "app_profissional",
            idSalao: session.idSalao,
            mensagem: "Item removido da comanda pelo app profissional.",
            detalhes: {
              acao: "remover_item",
              id_comanda: idComanda,
              id_item: idItem,
              id_profissional: session.idProfissional,
            },
          });
          revalidarComandaProfissional(idComanda);
        }
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao remover item.";
    redirectUrl = buildRedirectUrl(idComanda, "erro", message);
  }

  redirect(redirectUrl);
}

export async function enviarComandaParaCaixaAction(formData: FormData) {
  const idComanda = String(formData.get("id_comanda") || "");

  let redirectUrl = buildRedirectUrl(
    idComanda,
    "ok",
    "Comanda enviada para o caixa."
  );

  try {
    const { session, comanda } = await buscarComandaPermitida(idComanda);
    const supabaseAdmin = getSupabaseAdmin();

    if (String(comanda.status).toLowerCase() !== "aberta") {
      redirectUrl = buildRedirectUrl(
        idComanda,
        "erro",
        "Somente comandas abertas podem ser enviadas ao caixa."
      );
    } else {
      const { count, error: itensError } = await supabaseAdmin
        .from("comanda_itens")
        .select("*", { count: "exact", head: true })
        .eq("id_comanda", idComanda)
        .eq("id_salao", session.idSalao)
        .eq("ativo", true);

      if (itensError) {
        redirectUrl = buildRedirectUrl(
          idComanda,
          "erro",
          "Erro ao validar itens da comanda."
        );
      } else if (!count) {
        redirectUrl = buildRedirectUrl(
          idComanda,
          "erro",
          "Adicione pelo menos um item antes de enviar ao caixa."
        );
      } else {
        const { error: updateError } = await supabaseAdmin.rpc(
          "fn_enviar_comanda_para_pagamento",
          {
            p_id_salao: session.idSalao,
            p_id_comanda: idComanda,
            p_id_cliente: comanda.id_cliente || null,
            p_observacoes: comanda.observacoes || null,
            p_desconto: sanitizeMoney(comanda.desconto),
            p_acrescimo: sanitizeMoney(comanda.acrescimo),
          }
        );

        if (updateError) {
          redirectUrl = buildRedirectUrl(
            idComanda,
            "erro",
            updateError.message || "Erro ao enviar comanda para o caixa."
          );
        } else {
          await registrarLogSistema({
            gravidade: "info",
            modulo: "app_profissional",
            idSalao: session.idSalao,
            mensagem: "Comanda enviada para o caixa pelo app profissional.",
            detalhes: {
              acao: "enviar_caixa",
              id_comanda: idComanda,
              id_profissional: session.idProfissional,
              status: "aguardando_pagamento",
            },
          });
          revalidarComandaProfissional(idComanda);
        }
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao enviar comanda.";
    redirectUrl = buildRedirectUrl(idComanda, "erro", message);
  }

  redirect(redirectUrl);
}
