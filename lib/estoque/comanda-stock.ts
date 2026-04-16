import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

type ComandaItemRow = {
  id: string;
  tipo_item: string;
  id_produto?: string | null;
  id_servico?: string | null;
  descricao?: string | null;
  quantidade?: number | null;
};

type ProdutoRow = {
  id: string;
  nome: string;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  preco_custo?: number | null;
  custos_extras?: number | null;
  custo_real?: number | null;
  custo_por_dose?: number | null;
};

type ConsumoServicoRow = {
  id_produto: string;
  id_servico: string;
  quantidade_consumo?: number | null;
  custo_estimado?: number | null;
};

type MovimentoPlanejado = {
  itemId: string;
  idProduto: string;
  produtoNome: string;
  tipo: string;
  origem: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  observacoes: string;
};

type EstoqueRpcResponse = {
  processed?: boolean;
  reverted?: boolean;
  skipped?: boolean;
  reason?: string;
  movements?: number;
  itemsUpdated?: number;
};

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function getNumeric(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isMissingRpcError(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  const message = String(candidate?.message || "").toLowerCase();

  return (
    candidate?.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("function public.fn_processar_estoque_comanda_atomic") ||
    message.includes("function public.fn_reverter_estoque_comanda_atomic")
  );
}

function normalizeRpcResponse(data: unknown): EstoqueRpcResponse {
  if (!data || typeof data !== "object") {
    return {};
  }

  return data as EstoqueRpcResponse;
}

function getProdutoUnitCost(produto: ProdutoRow, fallback?: number | null) {
  const custoFallback = getNumeric(fallback);
  if (custoFallback > 0) return custoFallback;

  const custoPorDose = getNumeric(produto.custo_por_dose);
  if (custoPorDose > 0) return custoPorDose;

  const custoReal = getNumeric(produto.custo_real);
  if (custoReal > 0) return custoReal;

  return roundCurrency(
    getNumeric(produto.preco_custo) + getNumeric(produto.custos_extras)
  );
}

function buildProdutoObservation(params: {
  idComanda: string;
  idItem: string;
  idProduto: string;
}) {
  return `COMANDA:${params.idComanda}|ITEM:${params.idItem}|PRODUTO:${params.idProduto}|ORIGEM:PDV`;
}

function buildServicoObservation(params: {
  idComanda: string;
  idItem: string;
  idServico: string;
  idProduto: string;
}) {
  return `COMANDA:${params.idComanda}|ITEM:${params.idItem}|SERVICO:${params.idServico}|PRODUTO:${params.idProduto}|ORIGEM:SERVICO`;
}

async function carregarItensDaComanda(
  supabaseAdmin: AdminClient,
  idSalao: string,
  idComanda: string
) {
  const { data, error } = await supabaseAdmin
    .from("comanda_itens")
    .select("id, tipo_item, id_produto, id_servico, descricao, quantidade")
    .eq("id_salao", idSalao)
    .eq("id_comanda", idComanda)
    .eq("ativo", true);

  if (error) {
    throw new Error("Erro ao carregar itens da comanda para o estoque.");
  }

  return (data as ComandaItemRow[]) || [];
}

async function carregarProdutos(
  supabaseAdmin: AdminClient,
  idsProdutos: string[]
) {
  if (idsProdutos.length === 0) {
    return new Map<string, ProdutoRow>();
  }

  const { data, error } = await supabaseAdmin
    .from("produtos")
    .select(
      "id, nome, estoque_atual, estoque_minimo, preco_custo, custos_extras, custo_real, custo_por_dose"
    )
    .in("id", idsProdutos);

  if (error) {
    throw new Error("Erro ao carregar produtos para o estoque.");
  }

  return new Map(
    (((data as ProdutoRow[]) || [])).map((produto) => [produto.id, produto])
  );
}

async function carregarConsumoServicos(
  supabaseAdmin: AdminClient,
  idSalao: string,
  idsServicos: string[]
) {
  if (idsServicos.length === 0) {
    return [] as ConsumoServicoRow[];
  }

  const { data, error } = await supabaseAdmin
    .from("produto_servico_consumo")
    .select("id_produto, id_servico, quantidade_consumo, custo_estimado")
    .eq("id_salao", idSalao)
    .eq("ativo", true)
    .in("id_servico", idsServicos);

  if (error) {
    throw new Error("Erro ao carregar consumo dos servicos.");
  }

  return (data as ConsumoServicoRow[]) || [];
}

async function carregarMovimentosExistentes(
  supabaseAdmin: AdminClient,
  idSalao: string,
  idComanda: string
) {
  const { data, error } = await supabaseAdmin
    .from("produtos_movimentacoes")
    .select("id, observacoes, id_produto, quantidade")
    .eq("id_salao", idSalao)
    .like("observacoes", `COMANDA:${idComanda}|%`);

  if (error) {
    throw new Error("Erro ao carregar movimentacoes existentes da comanda.");
  }

  return (data || []) as Array<{
    id: string;
    observacoes?: string | null;
    id_produto?: string | null;
    quantidade?: number | null;
  }>;
}

async function resolverAlertasBaixoEstoque(
  supabaseAdmin: AdminClient,
  idSalao: string,
  produtosAfetados: ProdutoRow[],
  estoqueFinalMap: Map<string, number>
) {
  if (produtosAfetados.length === 0) return;

  const idsProdutos = produtosAfetados.map((produto) => produto.id);
  const { data: alertasAtivos, error } = await supabaseAdmin
    .from("produtos_alertas")
    .select("id, id_produto, resolvido")
    .eq("id_salao", idSalao)
    .eq("resolvido", false)
    .eq("tipo", "estoque_minimo")
    .in("id_produto", idsProdutos);

  if (error) {
    throw new Error("Erro ao verificar alertas de estoque.");
  }

  const alertasAtivosMap = new Map(
    (((alertasAtivos as Array<{ id: string; id_produto: string }>) || [])).map(
      (item) => [item.id_produto, item.id]
    )
  );

  const alertasParaResolver = produtosAfetados
    .filter((produto) => {
      const estoqueFinal = getNumeric(estoqueFinalMap.get(produto.id));
      const minimo = getNumeric(produto.estoque_minimo);
      return estoqueFinal > minimo && alertasAtivosMap.has(produto.id);
    })
    .map((produto) => alertasAtivosMap.get(produto.id))
    .filter(Boolean) as string[];

  if (alertasParaResolver.length > 0) {
    const { error: resolveError } = await supabaseAdmin
      .from("produtos_alertas")
      .update({
        resolvido: true,
        resolved_at: new Date().toISOString(),
      })
      .in("id", alertasParaResolver);

    if (resolveError) {
      throw new Error("Erro ao resolver alertas do estoque.");
    }
  }

  const alertasParaCriar = produtosAfetados
    .filter((produto) => {
      const estoqueFinal = getNumeric(estoqueFinalMap.get(produto.id));
      const minimo = getNumeric(produto.estoque_minimo);
      return estoqueFinal <= minimo && !alertasAtivosMap.has(produto.id);
    })
    .map((produto) => ({
      id_salao: idSalao,
      id_produto: produto.id,
      tipo: "estoque_minimo",
      mensagem: `O produto "${produto.nome}" ficou com estoque baixo.`,
      resolvido: false,
    }));

  if (alertasParaCriar.length > 0) {
    const { error: createError } = await supabaseAdmin
      .from("produtos_alertas")
      .insert(alertasParaCriar);

    if (createError) {
      throw new Error("Erro ao criar alertas do estoque.");
    }
  }
}

export async function processarEstoqueComanda(
  supabaseAdmin: AdminClient,
  params: {
    idSalao: string;
    idComanda: string;
    idUsuario?: string | null;
  }
) {
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
    "fn_processar_estoque_comanda_atomic",
    {
      p_id_salao: params.idSalao,
      p_id_comanda: params.idComanda,
      p_id_usuario: params.idUsuario || null,
    }
  );

  if (!rpcError) {
    return normalizeRpcResponse(rpcData);
  }

  if (!isMissingRpcError(rpcError)) {
    throw new Error(
      rpcError.message || "Erro ao processar estoque da comanda."
    );
  }

  const itens = await carregarItensDaComanda(
    supabaseAdmin,
    params.idSalao,
    params.idComanda
  );

  if (itens.length === 0) {
    return {
      skipped: true,
      reason: "Comanda sem itens ativos para movimentar estoque.",
    };
  }

  const idsProdutosDiretos = itens
    .map((item) => item.id_produto)
    .filter(Boolean) as string[];
  const idsServicos = itens
    .map((item) => item.id_servico)
    .filter(Boolean) as string[];

  const consumos = await carregarConsumoServicos(
    supabaseAdmin,
    params.idSalao,
    idsServicos
  );

  const idsProdutosConsumo = consumos.map((item) => item.id_produto);
  const produtos = await carregarProdutos(supabaseAdmin, [
    ...new Set([...idsProdutosDiretos, ...idsProdutosConsumo]),
  ]);

  const movimentosExistentes = await carregarMovimentosExistentes(
    supabaseAdmin,
    params.idSalao,
    params.idComanda
  );

  const observacoesExistentes = new Set(
    movimentosExistentes
      .map((item) => item.observacoes || "")
      .filter(Boolean)
  );

  const planejados: MovimentoPlanejado[] = [];
  const custoPorItem = new Map<string, number>();

  for (const item of itens) {
    const quantidadeItem = Math.max(getNumeric(item.quantidade), 0);
    if (quantidadeItem <= 0) continue;

    if (item.tipo_item === "produto" && item.id_produto) {
      const produto = produtos.get(item.id_produto);
      if (!produto) continue;

      const valorUnitario = getProdutoUnitCost(produto);
      const valorTotal = roundCurrency(valorUnitario * quantidadeItem);
      custoPorItem.set(item.id, valorTotal);

      const observacoes = buildProdutoObservation({
        idComanda: params.idComanda,
        idItem: item.id,
        idProduto: item.id_produto,
      });

      if (!observacoesExistentes.has(observacoes)) {
        planejados.push({
          itemId: item.id,
          idProduto: produto.id,
          produtoNome: produto.nome,
          tipo: "venda",
          origem: "pdv",
          quantidade: quantidadeItem,
          valorUnitario,
          valorTotal,
          observacoes,
        });
      }
    }

    if (item.tipo_item === "servico" && item.id_servico) {
      const consumosServico = consumos.filter(
        (consumo) => consumo.id_servico === item.id_servico
      );

      if (consumosServico.length === 0) {
        continue;
      }

      let custoTotalServico = 0;

      for (const consumo of consumosServico) {
        const produto = produtos.get(consumo.id_produto);
        if (!produto) continue;

        const quantidade = roundCurrency(
          getNumeric(consumo.quantidade_consumo) * quantidadeItem
        );

        if (quantidade <= 0) continue;

        const valorUnitario = getProdutoUnitCost(produto, consumo.custo_estimado);
        const valorTotal = roundCurrency(valorUnitario * quantidade);
        custoTotalServico = roundCurrency(custoTotalServico + valorTotal);

        const observacoes = buildServicoObservation({
          idComanda: params.idComanda,
          idItem: item.id,
          idServico: item.id_servico,
          idProduto: produto.id,
        });

        if (!observacoesExistentes.has(observacoes)) {
          planejados.push({
            itemId: item.id,
            idProduto: produto.id,
            produtoNome: produto.nome,
            tipo: "consumo_interno",
            origem: "servico",
            quantidade,
            valorUnitario,
            valorTotal,
            observacoes,
          });
        }
      }

      custoPorItem.set(item.id, custoTotalServico);
    }
  }

  if (custoPorItem.size > 0) {
    await Promise.all(
      Array.from(custoPorItem.entries()).map(async ([itemId, custoTotal]) => {
        const { error } = await supabaseAdmin
          .from("comanda_itens")
          .update({
            custo_total: custoTotal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", itemId)
          .eq("id_salao", params.idSalao);

        if (error) {
          throw new Error("Erro ao atualizar custo dos itens da comanda.");
        }
      })
    );
  }

  if (planejados.length === 0) {
    return {
      skipped: true,
      reason: "Estoque da comanda ja foi processado anteriormente.",
    };
  }

  const quantidadePorProduto = new Map<string, number>();

  for (const movimento of planejados) {
    quantidadePorProduto.set(
      movimento.idProduto,
      roundCurrency(
        getNumeric(quantidadePorProduto.get(movimento.idProduto)) +
          movimento.quantidade
      )
    );
  }

  const faltando = Array.from(quantidadePorProduto.entries())
    .map(([idProduto, quantidade]) => {
      const produto = produtos.get(idProduto);
      const estoqueAtual = getNumeric(produto?.estoque_atual);
      const saldoFinal = roundCurrency(estoqueAtual - quantidade);

      return {
        produto: produto?.nome || "Produto",
        saldoFinal,
      };
    })
    .filter((item) => item.saldoFinal < 0);

  if (faltando.length > 0) {
    throw new Error(
      `Estoque insuficiente para finalizar a comanda. Ajuste: ${faltando
        .map((item) => item.produto)
        .join(", ")}.`
    );
  }

  const { error: insertError } = await supabaseAdmin
    .from("produtos_movimentacoes")
    .insert(
      planejados.map((movimento) => ({
        id_salao: params.idSalao,
        id_produto: movimento.idProduto,
        tipo: movimento.tipo,
        origem: movimento.origem,
        quantidade: movimento.quantidade,
        valor_unitario: movimento.valorUnitario,
        valor_total: movimento.valorTotal,
        observacoes: movimento.observacoes,
        id_usuario: params.idUsuario || null,
      }))
    );

  if (insertError) {
    throw new Error("Erro ao registrar movimentacoes de estoque da comanda.");
  }

  const estoqueFinalMap = new Map<string, number>();

  await Promise.all(
    Array.from(quantidadePorProduto.entries()).map(async ([idProduto, quantidade]) => {
      const produto = produtos.get(idProduto);
      if (!produto) return;

      const novoEstoque = roundCurrency(
        getNumeric(produto.estoque_atual) - quantidade
      );

      estoqueFinalMap.set(idProduto, novoEstoque);

      const { error } = await supabaseAdmin
        .from("produtos")
        .update({
          estoque_atual: novoEstoque,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idProduto)
        .eq("id_salao", params.idSalao);

      if (error) {
        throw new Error("Erro ao atualizar estoque dos produtos.");
      }
    })
  );

  await resolverAlertasBaixoEstoque(
    supabaseAdmin,
    params.idSalao,
    Array.from(quantidadePorProduto.keys())
      .map((idProduto) => produtos.get(idProduto))
      .filter(Boolean) as ProdutoRow[],
    estoqueFinalMap
  );

  return {
    processed: true,
    movements: planejados.length,
    itemsUpdated: custoPorItem.size,
  };
}

export async function reverterEstoqueComanda(
  supabaseAdmin: AdminClient,
  params: {
    idSalao: string;
    idComanda: string;
  }
) {
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
    "fn_reverter_estoque_comanda_atomic",
    {
      p_id_salao: params.idSalao,
      p_id_comanda: params.idComanda,
    }
  );

  if (!rpcError) {
    return normalizeRpcResponse(rpcData);
  }

  if (!isMissingRpcError(rpcError)) {
    throw new Error(
      rpcError.message || "Erro ao devolver estoque da comanda."
    );
  }

  const movimentos = await carregarMovimentosExistentes(
    supabaseAdmin,
    params.idSalao,
    params.idComanda
  );

  if (movimentos.length === 0) {
    return {
      skipped: true,
      reason: "Nao ha movimentacoes registradas para esta comanda.",
    };
  }

  const idsProdutos = Array.from(
    new Set(movimentos.map((item) => item.id_produto).filter(Boolean))
  ) as string[];
  const produtos = await carregarProdutos(supabaseAdmin, idsProdutos);

  const quantidadePorProduto = new Map<string, number>();

  for (const movimento of movimentos) {
    if (!movimento.id_produto) continue;

    quantidadePorProduto.set(
      movimento.id_produto,
      roundCurrency(
        getNumeric(quantidadePorProduto.get(movimento.id_produto)) +
          getNumeric(movimento.quantidade)
      )
    );
  }

  const estoqueFinalMap = new Map<string, number>();

  await Promise.all(
    Array.from(quantidadePorProduto.entries()).map(async ([idProduto, quantidade]) => {
      const produto = produtos.get(idProduto);
      if (!produto) return;

      const novoEstoque = roundCurrency(
        getNumeric(produto.estoque_atual) + quantidade
      );

      estoqueFinalMap.set(idProduto, novoEstoque);

      const { error } = await supabaseAdmin
        .from("produtos")
        .update({
          estoque_atual: novoEstoque,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idProduto)
        .eq("id_salao", params.idSalao);

      if (error) {
        throw new Error("Erro ao devolver estoque dos produtos.");
      }
    })
  );

  const { error: deleteError } = await supabaseAdmin
    .from("produtos_movimentacoes")
    .delete()
    .eq("id_salao", params.idSalao)
    .like("observacoes", `COMANDA:${params.idComanda}|%`);

  if (deleteError) {
    throw new Error("Erro ao limpar movimentacoes de estoque da comanda.");
  }

  await resolverAlertasBaixoEstoque(
    supabaseAdmin,
    params.idSalao,
    Array.from(quantidadePorProduto.keys())
      .map((idProduto) => produtos.get(idProduto))
      .filter(Boolean) as ProdutoRow[],
    estoqueFinalMap
  );

  return {
    reverted: true,
    movements: movimentos.length,
  };
}
