"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";

function formatQuantidade(value: unknown) {
  const numero = Number(value || 0);
  return numero.toFixed(3);
}

function buildRedirectUrl(idComanda: string, key: "ok" | "erro", value: string) {
  return `/app-profissional/comandas/${idComanda}?${key}=${encodeURIComponent(
    value
  )}`;
}

async function buscarComandaPermitida(idComanda: string) {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: comanda, error: comandaError } = await supabaseAdmin
    .from("comandas")
    .select("id, id_salao, status, subtotal, desconto, acrescimo, total")
    .eq("id", idComanda)
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
    .eq("id_comanda", idComanda);

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

  const { data: itens, error: itensError } = await supabaseAdmin
    .from("comanda_itens")
    .select("valor_total")
    .eq("id_comanda", idComanda)
    .eq("id_salao", idSalao)
    .eq("ativo", true);

  if (itensError) {
    throw new Error("Erro ao recalcular a comanda.");
  }

  const subtotal = (itens ?? []).reduce(
    (acc: number, item: any) => acc + Number(item.valor_total || 0),
    0
  );

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
  const total = subtotal - desconto + acrescimo;

  const { error: updateError } = await supabaseAdmin
    .from("comandas")
    .update({
      subtotal,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idComanda)
    .eq("id_salao", idSalao);

  if (updateError) {
    throw new Error("Erro ao atualizar totais da comanda.");
  }
}

export async function adicionarServicoNaComandaAction(formData: FormData) {
  const idComanda = String(formData.get("id_comanda") || "");
  const idServico = String(formData.get("id_servico") || "");
  const quantidade = Number(formData.get("quantidade") || 1);

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
      const { data: servico, error: servicoError } = await supabaseAdmin
        .from("servicos")
        .select("id, nome, preco, preco_padrao, ativo, status")
        .eq("id", idServico)
        .eq("id_salao", session.idSalao)
        .maybeSingle();

      if (servicoError || !servico) {
        redirectUrl = buildRedirectUrl(
          idComanda,
          "erro",
          "Serviço não encontrado."
        );
      } else if (!servico.ativo || servico.status !== "ativo") {
        redirectUrl = buildRedirectUrl(idComanda, "erro", "Serviço inativo.");
      } else {
        const valorUnitario = Number(servico.preco ?? servico.preco_padrao ?? 0);
        const qtd = quantidade > 0 ? quantidade : 1;
        const valorTotal = valorUnitario * qtd;

        const { error: insertError } = await supabaseAdmin
          .from("comanda_itens")
          .insert({
            id_salao: session.idSalao,
            id_comanda: idComanda,
            tipo_item: "servico",
            tipo: "servico",
            id_servico: servico.id,
            descricao: servico.nome,
            quantidade: formatQuantidade(qtd),
            valor_unitario: valorUnitario,
            valor_total: valorTotal,
            custo_total: 0,
            id_profissional: session.idProfissional,
            origem: "app_profissional",
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          redirectUrl = buildRedirectUrl(
            idComanda,
            "erro",
            insertError.message || "Erro ao adicionar serviço."
          );
        } else {
          await recalcularTotaisComanda(idComanda, session.idSalao);
          revalidatePath(`/app-profissional/comandas/${idComanda}`);
          revalidatePath("/app-profissional/comandas");
          revalidatePath("/app-profissional/inicio");
          revalidatePath(`/comandas/${idComanda}`);
          revalidatePath("/comandas");
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
  const idItemExtra = String(formData.get("id_item_extra") || "");
  const quantidade = Number(formData.get("quantidade") || 1);

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
        const qtd = quantidade > 0 ? quantidade : 1;
        const valorTotal = valorUnitario * qtd;

        const { error: insertError } = await supabaseAdmin
          .from("comanda_itens")
          .insert({
            id_salao: session.idSalao,
            id_comanda: idComanda,
            tipo_item: "extra",
            tipo: null,
            id_item_extra: extra.id,
            descricao: extra.nome,
            quantidade: formatQuantidade(qtd),
            valor_unitario: valorUnitario,
            valor_total: valorTotal,
            custo_total: 0,
            id_profissional: session.idProfissional,
            origem: "app_profissional",
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          redirectUrl = buildRedirectUrl(
            idComanda,
            "erro",
            insertError.message || "Erro ao adicionar item extra."
          );
        } else {
          await recalcularTotaisComanda(idComanda, session.idSalao);
          revalidatePath(`/app-profissional/comandas/${idComanda}`);
          revalidatePath("/app-profissional/comandas");
          revalidatePath("/app-profissional/inicio");
          revalidatePath(`/comandas/${idComanda}`);
          revalidatePath("/comandas");
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
  const idItem = String(formData.get("id_item") || "");

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
        const { error: updateError } = await supabaseAdmin
          .from("comanda_itens")
          .update({
            ativo: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", idItem)
          .eq("id_comanda", idComanda)
          .eq("id_salao", session.idSalao)
          .eq("ativo", true);

        if (updateError) {
          redirectUrl = buildRedirectUrl(
            idComanda,
            "erro",
            updateError.message || "Erro ao excluir item."
          );
        } else {
          await recalcularTotaisComanda(idComanda, session.idSalao);
          revalidatePath(`/app-profissional/comandas/${idComanda}`);
          revalidatePath("/app-profissional/comandas");
          revalidatePath("/app-profissional/inicio");
          revalidatePath(`/comandas/${idComanda}`);
          revalidatePath("/comandas");
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
        const { error: updateError } = await supabaseAdmin
          .from("comandas")
          .update({
            status: "aguardando_pagamento",
            updated_at: new Date().toISOString(),
          })
          .eq("id", idComanda)
          .eq("id_salao", session.idSalao);

        if (updateError) {
          redirectUrl = buildRedirectUrl(
            idComanda,
            "erro",
            updateError.message || "Erro ao enviar comanda para o caixa."
          );
        } else {
          revalidatePath(`/app-profissional/comandas/${idComanda}`);
          revalidatePath("/app-profissional/comandas");
          revalidatePath(`/comandas/${idComanda}`);
          revalidatePath("/comandas");
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