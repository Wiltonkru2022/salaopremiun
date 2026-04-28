"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ComandaItemModal, {
  type ComandaItemModalPayload,
} from "@/components/comandas/ComandaItemModal";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { monitorClientOperation } from "@/lib/monitoring/client";
import type {
  ItemPayload,
  ProcessarComandaBody,
  ProcessarComandaErrorResponse,
  ProcessarComandaResponse,
} from "@/types/comandas";
import {
  formatMoney,
  formatMoneyInput,
  parseMoneyToNumber,
} from "@/lib/utils/comanda";

type Cliente = {
  id: string;
  nome: string;
};

type Profissional = {
  id: string;
  nome: string;
  comissao_percentual?: number | null;
  tipo_profissional?: string | null;
  assistentes_ids?: string[];
};

type Servico = {
  id: string;
  nome: string;
  preco?: number | null;
  preco_padrao?: number | null;
  custo_produto?: number | null;
  comissao_percentual?: number | null;
  comissao_percentual_padrao?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
  eh_combo?: boolean | null;
  combo_resumo?: string | null;
};

type Produto = {
  id: string;
  nome: string;
  preco_venda?: number | null;
  custo_real?: number | null;
  comissao_revenda_percentual?: number | null;
};

type ComandaItem = {
  id: string;
  tipo_item: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  custo_total: number;
  id_profissional?: string | null;
  id_assistente?: string | null;
  comissao_percentual_aplicada?: number | null;
  comissao_assistente_percentual_aplicada?: number | null;
};

type ComandaFormProps = {
  modo: "novo" | "editar";
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function ComandaForm({ modo }: ComandaFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const comandaId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemParaRemover, setItemParaRemover] = useState<string | null>(null);

  const [idSalao, setIdSalao] = useState("");
  const [numero, setNumero] = useState<number | null>(null);
  const [clienteId, setClienteId] = useState("");
  const [status, setStatus] = useState("aberta");
  const [observacoes, setObservacoes] = useState("");
  const [desconto, setDesconto] = useState("");
  const [acrescimo, setAcrescimo] = useState("");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ComandaItem[]>([]);

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, comandaId]);

  const subtotal = useMemo(
    () => itens.reduce((acc, item) => acc + Number(item.valor_total || 0), 0),
    [itens]
  );

  const descontoNumero = useMemo(
    () => parseMoneyToNumber(desconto),
    [desconto]
  );
  const acrescimoNumero = useMemo(
    () => parseMoneyToNumber(acrescimo),
    [acrescimo]
  );

  const total = useMemo(
    () => Number((subtotal - descontoNumero + acrescimoNumero).toFixed(2)),
    [subtotal, descontoNumero, acrescimoNumero]
  );

  const comandaBloqueada = ["fechada", "cancelada"].includes(
    status.toLowerCase()
  );

  function exigirComandaEditavel() {
    if (comandaBloqueada) {
      throw new Error("Comanda fechada ou cancelada nao pode ser editada.");
    }
  }

  async function processarComanda(
    acao: "salvar_base" | "adicionar_item" | "remover_item" | "enviar_pagamento",
    item?: Partial<ComandaItemModalPayload> & { idItem?: string | null }
  ) {
    const requestBody: ProcessarComandaBody = {
      idSalao,
      acao,
      comanda: {
        idComanda: modo === "editar" ? comandaId : null,
        numero,
        idCliente: clienteId || null,
        status,
        observacoes,
        desconto: descontoNumero,
        acrescimo: acrescimoNumero,
      },
      item: (item as ItemPayload | undefined) || undefined,
    };

    const response = await monitorClientOperation(
      {
        module: "comanda",
        action: acao,
        route: "/api/comandas/processar",
        screen: "comanda_form",
        entity: "comanda",
        entityId: modo === "editar" ? comandaId : null,
        details: {
          idSalao,
          modo,
          numero,
        },
        successMessage: `Acao da comanda concluida: ${acao}.`,
        errorMessage: `Falha ao processar comanda: ${acao}.`,
      },
      () =>
        fetch("/api/comandas/processar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })
    );

    const result = (await response.json().catch(() => ({}))) as Partial<
      ProcessarComandaResponse
    > &
      ProcessarComandaErrorResponse;

    if (!response.ok) {
      throw new Error(result.error || "Erro ao processar comanda.");
    }

    return result as ProcessarComandaResponse;
  }

  async function bootstrap() {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const usuarioLogado = await monitorClientOperation(
        {
          module: "comanda",
          action: "bootstrap",
          screen: "comanda_form",
          successMessage: "Contexto da comanda carregado com sucesso.",
          errorMessage: "Falha ao carregar contexto da comanda.",
        },
        () => getUsuarioLogado()
      );

      if (!usuarioLogado) {
        throw new Error("Usuario nao autenticado.");
      }

      if (!usuarioLogado.idSalao) {
        throw new Error("Nao foi possivel identificar o salao.");
      }

      setIdSalao(usuarioLogado.idSalao);

      const [
        clientesRes,
        profissionaisRes,
        assistentesRes,
        servicosRes,
        produtosRes,
      ] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome")
          .eq("id_salao", usuarioLogado.idSalao)
          .in("ativo", ["true", "ativo"])
          .order("nome", { ascending: true }),

        supabase
          .from("profissionais")
          .select("id, nome, comissao_percentual, tipo_profissional")
          .eq("id_salao", usuarioLogado.idSalao)
          .eq("ativo", true)
          .order("nome", { ascending: true }),

        supabase
          .from("profissional_assistentes")
          .select("id_profissional, id_assistente")
          .eq("id_salao", usuarioLogado.idSalao)
          .eq("ativo", true),

        supabase
          .from("servicos")
          .select(
            `
              id,
              nome,
              preco,
              preco_padrao,
              custo_produto,
              comissao_percentual,
              comissao_percentual_padrao,
              comissao_assistente_percentual,
              base_calculo,
              desconta_taxa_maquininha,
              eh_combo,
              combo_resumo
            `
          )
          .eq("id_salao", usuarioLogado.idSalao)
          .eq("ativo", true)
          .order("nome", { ascending: true }),

        supabase
          .from("produtos")
          .select(
            `
              id,
              nome,
              preco_venda,
              custo_real,
              comissao_revenda_percentual
            `
          )
          .eq("id_salao", usuarioLogado.idSalao)
          .eq("ativo", true)
          .order("nome", { ascending: true }),
      ]);

      if (clientesRes.error) throw clientesRes.error;
      if (profissionaisRes.error) throw profissionaisRes.error;
      if (assistentesRes.error) throw assistentesRes.error;
      if (servicosRes.error) throw servicosRes.error;
      if (produtosRes.error) throw produtosRes.error;

      const assistentesPorProfissional = new Map<string, string[]>();
      (
        (assistentesRes.data || []) as {
          id_profissional: string | null;
          id_assistente: string | null;
        }[]
      ).forEach((vinculo) => {
        if (!vinculo.id_profissional || !vinculo.id_assistente) return;

        const lista =
          assistentesPorProfissional.get(vinculo.id_profissional) || [];
        lista.push(vinculo.id_assistente);
        assistentesPorProfissional.set(vinculo.id_profissional, lista);
      });

      const profissionaisComAssistentes = (
        (profissionaisRes.data || []) as Profissional[]
      ).map((profissional) => ({
        ...profissional,
        assistentes_ids: assistentesPorProfissional.get(profissional.id) || [],
      }));

      setClientes((clientesRes.data as Cliente[]) || []);
      setProfissionais(profissionaisComAssistentes);
      setServicos(((servicosRes.data as unknown as Servico[]) || []));
      setProdutos((produtosRes.data as Produto[]) || []);

      if (modo === "novo") {
        const { data: ultimaComandaRows, error: ultimaError } = await supabase
          .from("comandas")
          .select("numero")
          .eq("id_salao", usuarioLogado.idSalao)
          .order("numero", { ascending: false })
          .limit(1);

        if (ultimaError) throw ultimaError;

        const ultimoNumero = ultimaComandaRows?.[0]?.numero || 0;
        setNumero(ultimoNumero + 1);
      }

      if (modo === "editar" && comandaId) {
        await carregarComanda(comandaId, usuarioLogado.idSalao);
      }
    } catch (error: unknown) {
      console.error(error);
      setErro(getErrorMessage(error, "Erro ao carregar comanda."));
    } finally {
      setLoading(false);
    }
  }

  async function carregarComanda(id: string, salaoId: string) {
    const { data: comanda, error } = await supabase
      .from("comandas")
      .select("aberta_em, acrescimo, cancelada_em, created_at, desconto, fechada_em, id, id_agendamento_principal, id_cliente, id_salao, motivo_cancelamento, numero, observacoes, origem, status, subtotal, total, updated_at")
      .eq("id", id)
      .eq("id_salao", salaoId)
      .maybeSingle();

    if (error) throw error;
    if (!comanda) throw new Error("Comanda nao encontrada.");

    setNumero(comanda.numero);
    setClienteId(comanda.id_cliente || "");
    setStatus(comanda.status || "aberta");
    setObservacoes(comanda.observacoes || "");
    setDesconto(Number(comanda.desconto || 0).toFixed(2).replace(".", ","));
    setAcrescimo(Number(comanda.acrescimo || 0).toFixed(2).replace(".", ","));

    await recarregarItens(id);
  }

  async function salvarComandaBase() {
    if (!numero) throw new Error("Numero da comanda nao definido.");
    if (modo === "editar") {
      exigirComandaEditavel();
    }

    const result = await processarComanda("salvar_base");
    if (!result.idComanda) {
      throw new Error("Nao foi possivel salvar a comanda.");
    }

    return result.idComanda;
  }

  async function handleSalvar() {
    try {
      setSaving(true);
      setErro("");
      setMsg("");

      const id = await salvarComandaBase();

      if (modo === "novo") {
        router.push(`/comandas/${id}`);
        return;
      }

      setMsg("Comanda atualizada com sucesso.");
    } catch (error: unknown) {
      console.error(error);
      setErro(getErrorMessage(error, "Erro ao salvar comanda."));
    } finally {
      setSaving(false);
    }
  }

  async function handleAdicionarItem(payload: ComandaItemModalPayload) {
    try {
      exigirComandaEditavel();
      setErro("");
      setMsg("");

      const result = await processarComanda("adicionar_item", payload);
      const id = result.idComanda;

      if (!id) {
        throw new Error("Comanda invalida.");
      }

      await recarregarItens(id);

      if (modo === "novo") {
        router.push(`/comandas/${id}`);
      }
    } catch (error: unknown) {
      console.error(error);
      setErro(getErrorMessage(error, "Erro ao adicionar item."));
    }
  }

  async function recarregarItens(id: string) {
    const { data: itensRows, error: itensError } = await supabase
      .from("comanda_itens")
      .select("ativo, base_calculo_aplicada, comissao_assistente_percentual_aplicada, comissao_assistente_valor_aplicado, comissao_percentual_aplicada, comissao_valor_aplicado, created_at, custo_total, desconta_taxa_maquininha_aplicada, descricao, id, id_agendamento, id_assistente, id_comanda, id_item_extra, id_produto, id_profissional, id_salao, id_servico, idempotency_key, observacoes, origem, quantidade, tipo, tipo_item, updated_at, valor_total, valor_unitario")
      .eq("id_comanda", id)
      .eq("ativo", true)
      .order("created_at", { ascending: true });

    if (itensError) throw itensError;

    setItens((itensRows as ComandaItem[]) || []);
  }

  async function removerItem(itemId: string) {
    try {
      exigirComandaEditavel();

      await processarComanda("remover_item", { idItem: itemId });
      await recarregarItens(comandaId);
    } catch (error: unknown) {
      console.error(error);
      setErro(getErrorMessage(error, "Erro ao remover item."));
    }
  }

  async function fecharComanda() {
    try {
      exigirComandaEditavel();

      if (!comandaId) throw new Error("Salve a comanda antes de fechar.");
      if (!itens.length || total <= 0) {
        throw new Error(
          "Adicione ao menos um item com valor antes de enviar para o caixa."
        );
      }

      await processarComanda("enviar_pagamento");

      setStatus("aguardando_pagamento");
      setMsg("Comanda enviada para o caixa.");
    } catch (error: unknown) {
      console.error(error);
      setErro(getErrorMessage(error, "Erro ao enviar comanda para pagamento."));
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          Carregando comanda...
        </div>
      </div>
    );
  }

  return (
    <>
      <ComandaItemModal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        onSave={handleAdicionarItem}
        profissionais={profissionais}
        servicos={servicos}
        produtos={produtos}
      />

      <ConfirmActionModal
        open={Boolean(itemParaRemover)}
        title="Remover item da comanda"
        description="Este item sera removido da comanda e o total sera recalculado."
        confirmLabel="Remover item"
        tone="danger"
        onClose={() => setItemParaRemover(null)}
        onConfirm={() => {
          const id = itemParaRemover;
          setItemParaRemover(null);
          if (id) void removerItem(id);
        }}
      />

      <div className="bg-white">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-zinc-300">
                  Comanda
                </p>
                <h1 className="mt-2 text-2xl font-bold md:text-3xl">
                  {modo === "novo" ? "Nova Comanda" : `Comanda #${numero}`}
                </h1>
                <p className="mt-2 text-sm text-zinc-500">
                  Controle atendimento, consumo, servicos, produtos e
                  fechamento.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
                Status: <strong>{status}</strong>
              </div>
            </div>
          </div>

          {erro ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          ) : null}

          {msg ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {msg}
            </div>
          ) : null}

          {comandaBloqueada ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Esta comanda esta {status}. Edicao de itens, valores e envio para
              pagamento fica bloqueada para manter o caixa e as comissoes
              consistentes.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">
                      Cliente
                    </label>
                    <select
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      disabled={comandaBloqueada}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                    >
                      <option value="">Selecione</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={comandaBloqueada}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                    >
                      <option value="aberta">Aberta</option>
                      <option value="em_atendimento">Em atendimento</option>
                      <option value="aguardando_pagamento">
                        Aguardando pagamento
                      </option>
                      <option value="fechada" disabled>
                        Fechada
                      </option>
                      <option value="cancelada" disabled>
                        Cancelada
                      </option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">
                      Observacoes
                    </label>
                    <textarea
                      rows={3}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      disabled={comandaBloqueada}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-zinc-900">
                    Itens da comanda
                  </h2>

                  <button
                    type="button"
                    onClick={() => setItemModalOpen(true)}
                    disabled={comandaBloqueada}
                    className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + Adicionar item
                  </button>
                </div>

                {itens.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
                    Nenhum item na comanda ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itens.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="text-xs uppercase tracking-wide text-zinc-500">
                            {item.tipo_item}
                          </div>
                          <div className="mt-1 font-semibold text-zinc-900">
                            {item.descricao}
                          </div>
                          <div className="mt-1 text-sm text-zinc-500">
                            Qtd: {Number(item.quantidade).toFixed(2)} • Unit: R${" "}
                            {Number(item.valor_unitario).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">
                              Total
                            </div>
                            <div className="font-bold text-zinc-900">
                              R$ {Number(item.valor_total).toFixed(2)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setItemParaRemover(item.id)}
                            disabled={comandaBloqueada}
                            className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-zinc-900">Resumo</h2>

                <div className="mt-5 space-y-4">
                  <Info label="Subtotal" value={formatMoney(subtotal)} />

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">
                      Desconto
                    </label>
                    <input
                      value={desconto}
                      onChange={(e) => setDesconto(formatMoneyInput(e.target.value))}
                      disabled={comandaBloqueada}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">
                      Acrescimo
                    </label>
                    <input
                      value={acrescimo}
                      onChange={(e) =>
                        setAcrescimo(formatMoneyInput(e.target.value))
                      }
                      disabled={comandaBloqueada}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                    />
                  </div>

                  <Info label="Total" value={formatMoney(total)} />
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => void handleSalvar()}
                    disabled={saving || comandaBloqueada}
                    className="w-full rounded-2xl bg-zinc-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Salvando..."
                      : modo === "novo"
                      ? "Salvar comanda"
                      : "Atualizar comanda"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void fecharComanda()}
                    disabled={saving || comandaBloqueada}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-3 font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Enviar para pagamento
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/comandas")}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-3 font-semibold text-zinc-700"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-zinc-900">{value}</div>
    </div>
  );
}
