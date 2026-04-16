import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  buscarVinculoProfissionalServico,
  resolverRegraComissaoServico,
} from "@/lib/comissoes/regrasServico";
import { registrarLogSistema } from "@/lib/system-logs";

type AcaoComanda =
  | "salvar_base"
  | "adicionar_item"
  | "editar_item"
  | "remover_item"
  | "enviar_pagamento"
  | "criar_por_agendamento";

type ComandaPayload = {
  idComanda?: string | null;
  numero?: number | null;
  idCliente?: string | null;
  status?: string | null;
  observacoes?: string | null;
  desconto?: number | null;
  acrescimo?: number | null;
};

type ItemPayload = {
  idItem?: string | null;
  tipo_item?: string | null;
  quantidade?: number | null;
  valor_unitario?: number | null;
  observacoes?: string | null;
  origem?: string | null;
  id_servico?: string | null;
  id_produto?: string | null;
  id_agendamento?: string | null;
  descricao?: string | null;
  custo_total?: number | null;
  id_profissional?: string | null;
  id_assistente?: string | null;
};

type Body = {
  idSalao?: string | null;
  acao?: AcaoComanda | null;
  idempotencyKey?: string | null;
  comanda?: ComandaPayload | null;
  item?: ItemPayload | null;
};

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

type ResolvedItemPayload = {
  tipoItem: string;
  quantidade: number;
  valorUnitario: number;
  idServico: string | null;
  idProduto: string | null;
  idProfissional: string | null;
  idAssistente: string | null;
  descricao: string;
  custoTotal: number;
  comissaoPercentual: number;
  comissaoAssistentePercentual: number;
  baseCalculo: string;
  descontaTaxaMaquininha: boolean;
  origem: string;
  observacoes: string | null;
  idAgendamento: string | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

function sanitizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function sanitizeInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function sanitizeText(value: unknown) {
  const parsed = String(value || "").trim();
  return parsed || null;
}

function sanitizeIdempotencyKey(value: unknown) {
  const parsed = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 160);

  return parsed || null;
}

function criarChaveItemAgendamento(resolved: ResolvedItemPayload) {
  if (!resolved.idAgendamento) {
    return null;
  }

  return sanitizeIdempotencyKey(
    [
      "agendamento-item",
      resolved.idAgendamento,
      resolved.idServico || "sem-servico",
      resolved.idProduto || "sem-produto",
      resolved.idProfissional || "sem-profissional",
    ].join(":")
  );
}

function resolveHttpStatus(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

function isMissingRpcFunction(error: unknown, functionName: string) {
  const candidate = error as { code?: string; message?: string } | null;
  const message = String(candidate?.message || "").toLowerCase();

  return (
    candidate?.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes(`function public.${functionName.toLowerCase()}`)
  );
}

async function garantirComandaBase(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  comanda: ComandaPayload;
}) {
  const { supabaseAdmin, idSalao, comanda } = params;
  const numero = sanitizeInt(comanda.numero);
  let idComanda = sanitizeUuid(comanda.idComanda);

  if (idComanda) {
    return idComanda;
  }

  if (!numero) {
    throw new Error("Numero da comanda obrigatorio para criar a comanda.");
  }

  const { data: novoId, error } = await supabaseAdmin.rpc(
    "fn_salvar_comanda_base",
    {
      p_id_salao: idSalao,
      p_id_comanda: null,
      p_numero: numero,
      p_id_cliente: sanitizeUuid(comanda.idCliente),
      p_status: sanitizeText(comanda.status) || "aberta",
      p_observacoes: sanitizeText(comanda.observacoes),
      p_desconto: sanitizeMoney(comanda.desconto),
      p_acrescimo: sanitizeMoney(comanda.acrescimo),
    }
  );

  if (error || !novoId) {
    throw error || new Error("Erro ao criar comanda.");
  }

  idComanda = String(novoId);
  return idComanda;
}

async function resolverItemPayload(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  item: ItemPayload;
}) {
  const { supabaseAdmin, idSalao, item } = params;

  const tipoItem = String(item.tipo_item || "").trim().toLowerCase();
  const quantidade = Math.max(Number(item.quantidade || 1), 1);
  const valorUnitario = sanitizeMoney(item.valor_unitario);
  const idServico = sanitizeUuid(item.id_servico);
  const idProduto = sanitizeUuid(item.id_produto);
  const idProfissional = sanitizeUuid(item.id_profissional);
  const idAssistente = sanitizeUuid(item.id_assistente);

  let descricao = sanitizeText(item.descricao);
  let custoTotal = sanitizeMoney(item.custo_total);
  let comissaoPercentual = 0;
  let comissaoAssistentePercentual = 0;
  let baseCalculo = "bruto";
  let descontaTaxaMaquininha = false;

  if (tipoItem === "servico") {
    if (!idServico) {
      throw new Error("Servico obrigatorio para item de servico.");
    }

    const [
      { data: servico, error: servicoError },
      { data: profissional, error: profissionalError },
    ] = await Promise.all([
      supabaseAdmin
        .from("servicos")
        .select(
          "id, nome, preco, preco_padrao, custo_produto, comissao_percentual, comissao_percentual_padrao, comissao_assistente_percentual, base_calculo, desconta_taxa_maquininha"
        )
        .eq("id", idServico)
        .eq("id_salao", idSalao)
        .maybeSingle(),
      idProfissional
        ? supabaseAdmin
            .from("profissionais")
            .select("id, nome, comissao_percentual, tipo_profissional")
            .eq("id", idProfissional)
            .eq("id_salao", idSalao)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (servicoError || !servico) {
      throw new Error("Servico nao encontrado para este salao.");
    }

    if (profissionalError) {
      throw new Error("Erro ao validar profissional do item.");
    }

    if (
      profissional &&
      String(profissional.tipo_profissional || "profissional").toLowerCase() ===
        "assistente"
    ) {
      throw new Error("Selecione um profissional principal, nao um assistente.");
    }

    if (idAssistente && idProfissional) {
      const { data: vinculoAssistente, error: vinculoAssistenteError } =
        await supabaseAdmin
          .from("profissional_assistentes")
          .select("id")
          .eq("id_salao", idSalao)
          .eq("id_profissional", idProfissional)
          .eq("id_assistente", idAssistente)
          .eq("ativo", true)
          .maybeSingle();

      if (vinculoAssistenteError || !vinculoAssistente) {
        throw new Error("Assistente nao vinculado ao profissional selecionado.");
      }
    }

    const vinculo =
      idProfissional && idServico
        ? await buscarVinculoProfissionalServico({
            supabase: supabaseAdmin,
            idProfissional,
            idServico,
          })
        : null;

    const regra = resolverRegraComissaoServico({
      servico,
      profissional,
      vinculo,
    });

    descricao = descricao || servico.nome || "Servico";
    custoTotal = sanitizeMoney(servico.custo_produto);
    comissaoPercentual = regra.comissaoPercentual;
    comissaoAssistentePercentual = regra.comissaoAssistentePercentual;
    baseCalculo = regra.baseCalculo;
    descontaTaxaMaquininha = regra.descontaTaxaMaquininha;
  } else if (tipoItem === "produto") {
    if (!idProduto) {
      throw new Error("Produto obrigatorio para item de produto.");
    }

    const { data: produto, error: produtoError } = await supabaseAdmin
      .from("produtos")
      .select("id, nome, custo_real, comissao_revenda_percentual")
      .eq("id", idProduto)
      .eq("id_salao", idSalao)
      .maybeSingle();

    if (produtoError || !produto) {
      throw new Error("Produto nao encontrado para este salao.");
    }

    descricao = descricao || produto.nome || "Produto";
    custoTotal = sanitizeMoney(Number(produto.custo_real || 0) * quantidade);
    comissaoPercentual = sanitizeMoney(produto.comissao_revenda_percentual);
  } else {
    descricao = descricao || "Item manual";
    custoTotal = sanitizeMoney(item.custo_total);
  }

  const observacoes = sanitizeText(item.observacoes);
  const origem = sanitizeText(item.origem) || "manual";

  const resolved: ResolvedItemPayload = {
    tipoItem,
    quantidade,
    valorUnitario,
    idServico,
    idProduto,
    idProfissional,
    idAssistente,
    descricao: descricao || "Item manual",
    custoTotal,
    comissaoPercentual,
    comissaoAssistentePercentual,
    baseCalculo,
    descontaTaxaMaquininha,
    origem,
    observacoes,
    idAgendamento: sanitizeUuid(item.id_agendamento),
  };

  return resolved;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const idSalao = sanitizeUuid(body.idSalao);
    const acao = String(body.acao || "").trim().toLowerCase() as AcaoComanda;
    const idempotencyKey = sanitizeIdempotencyKey(body.idempotencyKey);

    if (!idSalao) {
      return NextResponse.json({ error: "Salao obrigatorio." }, { status: 400 });
    }

    if (
      ![
        "salvar_base",
        "adicionar_item",
        "editar_item",
        "remover_item",
        "enviar_pagamento",
        "criar_por_agendamento",
      ].includes(acao)
    ) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const permissionMembership = await requireSalaoPermission(
      idSalao,
      "comandas_ver"
    );

    const supabaseAdmin = getSupabaseAdmin();
    const comanda = body.comanda || {};
    const item = body.item || {};

    if (acao === "criar_por_agendamento") {
      const idAgendamento = sanitizeUuid(item.id_agendamento);

      if (!idAgendamento) {
        return NextResponse.json(
          { error: "Agendamento obrigatorio para abrir no caixa." },
          { status: 400 }
        );
      }

      const { data: agendamento, error: agendamentoError } = await supabaseAdmin
        .from("agendamentos")
        .select("id, id_salao")
        .eq("id", idAgendamento)
        .eq("id_salao", idSalao)
        .maybeSingle();

      if (agendamentoError || !agendamento?.id) {
        return NextResponse.json(
          { error: "Agendamento nao encontrado para este salao." },
          { status: 404 }
        );
      }

      const { data, error } = await supabaseAdmin.rpc(
        "fn_criar_comanda_por_agendamento",
        {
          p_id_agendamento: idAgendamento,
        }
      );

      if (error) {
        console.error("Erro ao criar comanda por agendamento:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao abrir agendamento no caixa." },
          { status: resolveHttpStatus(error) }
        );
      }

      await registrarLogSistema({
        gravidade: data?.ja_existia ? "warning" : "info",
        modulo: "comandas",
        idSalao,
        idUsuario: permissionMembership.usuario.id,
        mensagem: data?.ja_existia
          ? "Comanda de agendamento reaproveitada por idempotencia."
          : "Comanda criada a partir de agendamento.",
        detalhes: {
          acao,
          id_agendamento: idAgendamento,
          id_comanda: data?.id_comanda || null,
          ja_existia: Boolean(data?.ja_existia),
        },
      });

      return NextResponse.json({
        ok: true,
        idComanda: data?.id_comanda || null,
        jaExistia: Boolean(data?.ja_existia),
      });
    }

    if (acao === "salvar_base") {
      const numero = sanitizeInt(comanda.numero);

      if (!numero) {
        return NextResponse.json(
          { error: "Numero da comanda obrigatorio." },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin.rpc("fn_salvar_comanda_base", {
        p_id_salao: idSalao,
        p_id_comanda: sanitizeUuid(comanda.idComanda),
        p_numero: numero,
        p_id_cliente: sanitizeUuid(comanda.idCliente),
        p_status: sanitizeText(comanda.status) || "aberta",
        p_observacoes: sanitizeText(comanda.observacoes),
        p_desconto: sanitizeMoney(comanda.desconto),
        p_acrescimo: sanitizeMoney(comanda.acrescimo),
      });

      if (error) {
        console.error("Erro ao salvar base da comanda:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao salvar comanda." },
          { status: resolveHttpStatus(error) }
        );
      }

      await registrarLogSistema({
        gravidade: "info",
        modulo: "comandas",
        idSalao,
        idUsuario: permissionMembership.usuario.id,
        mensagem: "Base da comanda salva pelo servidor.",
        detalhes: {
          acao,
          id_comanda: data,
          numero,
          status: sanitizeText(comanda.status) || "aberta",
        },
      });

      return NextResponse.json({ ok: true, idComanda: data });
    }

    if (acao === "adicionar_item" || acao === "editar_item") {
      let idComanda = sanitizeUuid(comanda.idComanda);

      try {
        if (acao === "adicionar_item") {
          idComanda = await garantirComandaBase({
            supabaseAdmin,
            idSalao,
            comanda,
          });
        }

        if (!idComanda) {
          return NextResponse.json(
            { error: "Comanda obrigatoria para salvar item." },
            { status: 400 }
          );
        }

        const resolved = await resolverItemPayload({
          supabaseAdmin,
          idSalao,
          item,
        });

        if (acao === "adicionar_item") {
          const itemIdempotencyKey =
            idempotencyKey || criarChaveItemAgendamento(resolved);

          let { data: itemResult, error: addItemError } = await supabaseAdmin.rpc(
            "fn_adicionar_item_comanda_idempotente",
            {
              p_id_salao: idSalao,
              p_id_comanda: idComanda,
              p_tipo_item: resolved.tipoItem,
              p_id_agendamento: resolved.idAgendamento,
              p_id_servico: resolved.idServico,
              p_id_produto: resolved.idProduto,
              p_descricao: resolved.descricao,
              p_quantidade: resolved.quantidade,
              p_valor_unitario: resolved.valorUnitario,
              p_custo_total: resolved.custoTotal,
              p_id_profissional: resolved.idProfissional,
              p_id_assistente: resolved.idAssistente,
              p_comissao_percentual: resolved.comissaoPercentual,
              p_comissao_assistente_percentual:
                resolved.comissaoAssistentePercentual,
              p_base_calculo: resolved.baseCalculo,
              p_desconta_taxa_maquininha: resolved.descontaTaxaMaquininha,
              p_origem: resolved.origem,
              p_observacoes: resolved.observacoes,
              p_desconto: sanitizeMoney(comanda.desconto),
              p_acrescimo: sanitizeMoney(comanda.acrescimo),
              p_idempotency_key: itemIdempotencyKey,
            }
          );

          if (
            addItemError &&
            isMissingRpcFunction(
              addItemError,
              "fn_adicionar_item_comanda_idempotente"
            )
          ) {
            const fallback = await supabaseAdmin.rpc(
              "fn_adicionar_item_comanda",
              {
                p_id_salao: idSalao,
                p_id_comanda: idComanda,
                p_tipo_item: resolved.tipoItem,
                p_id_agendamento: resolved.idAgendamento,
                p_id_servico: resolved.idServico,
                p_id_produto: resolved.idProduto,
                p_descricao: resolved.descricao,
                p_quantidade: resolved.quantidade,
                p_valor_unitario: resolved.valorUnitario,
                p_custo_total: resolved.custoTotal,
                p_id_profissional: resolved.idProfissional,
                p_id_assistente: resolved.idAssistente,
                p_comissao_percentual: resolved.comissaoPercentual,
                p_comissao_assistente_percentual:
                  resolved.comissaoAssistentePercentual,
                p_base_calculo: resolved.baseCalculo,
                p_desconta_taxa_maquininha: resolved.descontaTaxaMaquininha,
                p_origem: resolved.origem,
                p_observacoes: resolved.observacoes,
                p_desconto: sanitizeMoney(comanda.desconto),
                p_acrescimo: sanitizeMoney(comanda.acrescimo),
              }
            );
            itemResult = fallback.data;
            addItemError = fallback.error;
          }

          if (addItemError) {
            console.error("Erro ao adicionar item na comanda:", addItemError);
            return NextResponse.json(
              { error: addItemError.message || "Erro ao adicionar item." },
              { status: resolveHttpStatus(addItemError) }
            );
          }

          const resultRow = Array.isArray(itemResult) ? itemResult[0] : null;
          const itemId =
            resultRow && typeof resultRow === "object" && "id_item" in resultRow
              ? String(resultRow.id_item || "")
              : String(itemResult || "");
          const jaExistia =
            resultRow && typeof resultRow === "object" && "ja_existia" in resultRow
              ? Boolean(resultRow.ja_existia)
              : false;

          await registrarLogSistema({
            gravidade: jaExistia ? "warning" : "info",
            modulo: "comandas",
            idSalao,
            idUsuario: permissionMembership.usuario.id,
            mensagem: jaExistia
              ? "Item de comanda reaproveitado por idempotencia."
              : "Item adicionado na comanda pelo servidor.",
            detalhes: {
              acao,
              id_comanda: idComanda,
              id_item: itemId || null,
              tipo_item: resolved.tipoItem,
              idempotency_key: itemIdempotencyKey,
              ja_existia: jaExistia,
            },
          });

          return NextResponse.json({
            ok: true,
            idComanda,
            idItem: itemId,
            idempotentReplay: jaExistia,
          });
        }

        const idItem = sanitizeUuid(item.idItem);

        if (!idItem) {
          return NextResponse.json(
            { error: "Item obrigatorio para editar a comanda." },
            { status: 400 }
          );
        }

        const { error: updateItemError } = await supabaseAdmin.rpc(
          "fn_atualizar_item_comanda",
          {
            p_id_salao: idSalao,
            p_id_comanda: idComanda,
            p_id_item: idItem,
            p_tipo_item: resolved.tipoItem,
            p_id_agendamento: resolved.idAgendamento,
            p_id_servico: resolved.idServico,
            p_id_produto: resolved.idProduto,
            p_descricao: resolved.descricao,
            p_quantidade: resolved.quantidade,
            p_valor_unitario: resolved.valorUnitario,
            p_custo_total: resolved.custoTotal,
            p_id_profissional: resolved.idProfissional,
            p_id_assistente: resolved.idAssistente,
            p_comissao_percentual: resolved.comissaoPercentual,
            p_comissao_assistente_percentual:
              resolved.comissaoAssistentePercentual,
            p_base_calculo: resolved.baseCalculo,
            p_desconta_taxa_maquininha: resolved.descontaTaxaMaquininha,
            p_origem: resolved.origem,
            p_observacoes: resolved.observacoes,
            p_desconto: sanitizeMoney(comanda.desconto),
            p_acrescimo: sanitizeMoney(comanda.acrescimo),
          }
        );

        if (updateItemError) {
          console.error("Erro ao atualizar item da comanda:", updateItemError);
          return NextResponse.json(
            { error: updateItemError.message || "Erro ao atualizar item." },
            { status: resolveHttpStatus(updateItemError) }
          );
        }

        await registrarLogSistema({
          gravidade: "info",
          modulo: "comandas",
          idSalao,
          idUsuario: permissionMembership.usuario.id,
          mensagem: "Item da comanda atualizado pelo servidor.",
          detalhes: {
            acao,
            id_comanda: idComanda,
            id_item: idItem,
            tipo_item: resolved.tipoItem,
          },
        });

        return NextResponse.json({
          ok: true,
          idComanda,
          idItem,
        });
      } catch (error) {
        console.error("Erro ao resolver item da comanda:", error);
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Erro ao validar item da comanda.",
          },
          { status: 400 }
        );
      }
    }

    if (acao === "remover_item") {
      const idComanda = sanitizeUuid(comanda.idComanda);
      const idItem = sanitizeUuid(item.idItem);

      if (!idComanda || !idItem) {
        return NextResponse.json(
          { error: "Comanda e item sao obrigatorios para remover." },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin.rpc("fn_remover_item_comanda", {
        p_id_salao: idSalao,
        p_id_comanda: idComanda,
        p_id_item: idItem,
        p_desconto: sanitizeMoney(comanda.desconto),
        p_acrescimo: sanitizeMoney(comanda.acrescimo),
      });

      if (error) {
        console.error("Erro ao remover item da comanda:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao remover item." },
          { status: resolveHttpStatus(error) }
        );
      }

      await registrarLogSistema({
        gravidade: "warning",
        modulo: "comandas",
        idSalao,
        idUsuario: permissionMembership.usuario.id,
        mensagem: "Item removido da comanda pelo servidor.",
        detalhes: {
          acao,
          id_comanda: idComanda,
          id_item: idItem,
        },
      });

      return NextResponse.json({ ok: true, idComanda });
    }

    const idComanda = sanitizeUuid(comanda.idComanda);

    if (!idComanda) {
      return NextResponse.json(
        { error: "Comanda obrigatoria para enviar ao pagamento." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.rpc(
      "fn_enviar_comanda_para_pagamento",
      {
        p_id_salao: idSalao,
        p_id_comanda: idComanda,
        p_id_cliente: sanitizeUuid(comanda.idCliente),
        p_observacoes: sanitizeText(comanda.observacoes),
        p_desconto: sanitizeMoney(comanda.desconto),
        p_acrescimo: sanitizeMoney(comanda.acrescimo),
      }
    );

    if (error) {
      console.error("Erro ao enviar comanda para pagamento:", error);
      return NextResponse.json(
        { error: error.message || "Erro ao enviar comanda para o caixa." },
        { status: resolveHttpStatus(error) }
      );
    }

    await registrarLogSistema({
      gravidade: "info",
      modulo: "comandas",
      idSalao,
      idUsuario: permissionMembership.usuario.id,
      mensagem: "Comanda enviada para pagamento pelo servidor.",
      detalhes: {
        acao,
        id_comanda: idComanda,
        status: "aguardando_pagamento",
      },
    });

    return NextResponse.json({
      ok: true,
      idComanda,
      status: "aguardando_pagamento",
    });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Erro geral ao processar comanda:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar comanda." },
      { status: 500 }
    );
  }
}
