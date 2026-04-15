"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ComandaItemModal from "@/components/comandas/ComandaItemModal";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { calcularValorTotal, formatMoney, formatMoneyInput, parseMoneyToNumber } from "@/lib/utils/comanda";
import {
  buscarVinculoProfissionalServico,
  resolverRegraComissaoServico,
} from "@/lib/comissoes/regrasServico";

type Cliente = {
  id: string;
  nome: string;
};

type Profissional = {
  id: string;
  nome: string;
  comissao_percentual?: number | null;
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
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, comandaId]);

  const subtotal = useMemo(
    () => itens.reduce((acc, item) => acc + Number(item.valor_total || 0), 0),
    [itens]
  );

  const descontoNumero = useMemo(() => parseMoneyToNumber(desconto), [desconto]);
  const acrescimoNumero = useMemo(() => parseMoneyToNumber(acrescimo), [acrescimo]);

  const total = useMemo(
    () => Number((subtotal - descontoNumero + acrescimoNumero).toFixed(2)),
    [subtotal, descontoNumero, acrescimoNumero]
  );

async function bootstrap() {
  try {
    setLoading(true);
    setErro("");
    setMsg("");

    const usuarioLogado = await getUsuarioLogado();

    if (!usuarioLogado) {
      throw new Error("Usuário não autenticado.");
    }

    if (!usuarioLogado.idSalao) {
      throw new Error("Não foi possível identificar o salão.");
    }

    setIdSalao(usuarioLogado.idSalao);

    const [
      clientesRes,
      profissionaisRes,
      servicosRes,
      produtosRes,
    ] = await Promise.all([
      supabase
        .from("clientes")
        .select("id, nome")
        .eq("id_salao", usuarioLogado.idSalao)
        .eq("ativo", true)
        .order("nome", { ascending: true }),

      supabase
        .from("profissionais")
        .select("id, nome, comissao_percentual")
        .eq("id_salao", usuarioLogado.idSalao)
        .eq("ativo", true)
        .order("nome", { ascending: true }),

      supabase
        .from("servicos")
        .select(`
          id,
          nome,
          preco,
          preco_padrao,
          custo_produto,
          comissao_percentual,
          comissao_percentual_padrao,
          comissao_assistente_percentual,
          base_calculo,
          desconta_taxa_maquininha
        `)
        .eq("id_salao", usuarioLogado.idSalao)
        .eq("ativo", true)
        .order("nome", { ascending: true }),

      supabase
        .from("produtos")
        .select(`
          id,
          nome,
          preco_venda,
          custo_real,
          comissao_revenda_percentual
        `)
        .eq("id_salao", usuarioLogado.idSalao)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);

    if (clientesRes.error) throw clientesRes.error;
    if (profissionaisRes.error) throw profissionaisRes.error;
    if (servicosRes.error) throw servicosRes.error;
    if (produtosRes.error) throw produtosRes.error;

    setClientes((clientesRes.data as Cliente[]) || []);
    setProfissionais((profissionaisRes.data as Profissional[]) || []);
    setServicos((servicosRes.data as Servico[]) || []);
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
  } catch (e: any) {
    console.error(e);
    setErro(e.message || "Erro ao carregar comanda.");
  } finally {
    setLoading(false);
  }
}

  async function carregarComanda(id: string, salaoId: string) {
    const { data: comanda, error } = await supabase
      .from("comandas")
      .select("*")
      .eq("id", id)
      .eq("id_salao", salaoId)
      .maybeSingle();

    if (error) throw error;
    if (!comanda) throw new Error("Comanda não encontrada.");

    setNumero(comanda.numero);
    setClienteId(comanda.id_cliente || "");
    setStatus(comanda.status || "aberta");
    setObservacoes(comanda.observacoes || "");
    setDesconto(Number(comanda.desconto || 0).toFixed(2).replace(".", ","));
    setAcrescimo(Number(comanda.acrescimo || 0).toFixed(2).replace(".", ","));

    const { data: itensRows, error: itensError } = await supabase
      .from("comanda_itens")
      .select("*")
      .eq("id_comanda", id)
      .eq("ativo", true)
      .order("created_at", { ascending: true });

    if (itensError) throw itensError;

    setItens((itensRows as ComandaItem[]) || []);
  }

  async function salvarComandaBase() {
    if (!numero) throw new Error("Número da comanda não definido.");

    const payload = {
      id_salao: idSalao,
      numero,
      id_cliente: clienteId || null,
      status,
      observacoes: observacoes || null,
      subtotal,
      desconto: descontoNumero,
      acrescimo: acrescimoNumero,
      total,
    };

    if (modo === "novo") {
      const { data, error } = await supabase
        .from("comandas")
        .insert(payload)
        .select("id")
        .limit(1);

      if (error) throw error;

      const novoId = data?.[0]?.id;
      if (!novoId) throw new Error("Não foi possível criar a comanda.");

      return novoId;
    }

    const { error } = await supabase
      .from("comandas")
      .update(payload)
      .eq("id", comandaId)
      .eq("id_salao", idSalao);

    if (error) throw error;
    return comandaId;
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
    } catch (e: any) {
      console.error(e);
      setErro(e.message || "Erro ao salvar comanda.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdicionarItem(payload: any) {
    try {
      const id = modo === "novo" ? await salvarComandaBase() : comandaId;
      if (!id) throw new Error("Comanda inválida.");

      const quantidade = Number(payload.quantidade || 1);
      const valorUnitario = Number(payload.valor_unitario || 0);
      const valorTotal = calcularValorTotal(quantidade, valorUnitario);
      let regraServico: ReturnType<typeof resolverRegraComissaoServico> | null = null;

      if (payload.tipo_item === "servico") {
        const servicoSelecionado = servicos.find((item) => item.id === payload.id_servico);
        const profissionalSelecionado = profissionais.find(
          (item) => item.id === payload.id_profissional
        );
        const vinculo =
          payload.id_servico && payload.id_profissional
            ? await buscarVinculoProfissionalServico({
                supabase,
                idProfissional: payload.id_profissional,
                idServico: payload.id_servico,
              })
            : null;

        regraServico = resolverRegraComissaoServico({
          servico: servicoSelecionado,
          profissional: profissionalSelecionado,
          vinculo,
        });
      }

      const itemPayload = {
        id_salao: idSalao,
        id_comanda: id,
        tipo_item: payload.tipo_item,
        id_agendamento: payload.id_agendamento || null,
        id_servico: payload.id_servico || null,
        id_produto: payload.id_produto || null,
        descricao: payload.descricao,
        quantidade,
        valor_unitario: valorUnitario,
        valor_total: valorTotal,
        custo_total: Number(payload.custo_total || 0),
        id_profissional: payload.id_profissional || null,
        id_assistente: payload.id_assistente || null,
        comissao_percentual_aplicada: regraServico
          ? regraServico.comissaoPercentual
          : Number(payload.comissao_percentual_aplicada ?? 0),
        comissao_valor_aplicado: 0,
        comissao_assistente_percentual_aplicada: regraServico
          ? regraServico.comissaoAssistentePercentual
          : Number(payload.comissao_assistente_percentual_aplicada ?? 0),
        comissao_assistente_valor_aplicado: 0,
        base_calculo_aplicada: regraServico
          ? regraServico.baseCalculo
          : payload.base_calculo_aplicada || "bruto",
        desconta_taxa_maquininha_aplicada: regraServico
          ? regraServico.descontaTaxaMaquininha
          : Boolean(payload.desconta_taxa_maquininha_aplicada ?? false),
        origem: "manual",
        observacoes: payload.observacoes || null,
      };

      const { error } = await supabase.from("comanda_itens").insert(itemPayload);
      if (error) throw error;

      await recarregarItens(id);

      if (modo === "novo") {
        router.push(`/comandas/${id}`);
      }
    } catch (e: any) {
      console.error(e);
      setErro(e.message || "Erro ao adicionar item.");
    }
  }

  async function recarregarItens(id: string) {
    const { data: itensRows, error: itensError } = await supabase
      .from("comanda_itens")
      .select("*")
      .eq("id_comanda", id)
      .order("created_at", { ascending: true });

    if (itensError) throw itensError;

    setItens((itensRows as ComandaItem[]) || []);

    const novoSubtotal = (itensRows || []).reduce(
      (acc: number, item: any) => acc + Number(item.valor_total || 0),
      0
    );

    await supabase
      .from("comandas")
      .update({
        subtotal: novoSubtotal,
        desconto: descontoNumero,
        acrescimo: acrescimoNumero,
        total: Number((novoSubtotal - descontoNumero + acrescimoNumero).toFixed(2)),
      })
      .eq("id", id)
      .eq("id_salao", idSalao);
  }

  async function removerItem(itemId: string) {
    try {
      const confirmar = window.confirm("Remover este item da comanda?");
      if (!confirmar) return;

      const { error } = await supabase
        .from("comanda_itens")
        .delete()
        .eq("id", itemId)
        .eq("id_salao", idSalao);

      if (error) throw error;

      await recarregarItens(comandaId);
    } catch (e: any) {
      console.error(e);
      setErro(e.message || "Erro ao remover item.");
    }
  }

  async function fecharComanda() {
    try {
      if (!comandaId) throw new Error("Salve a comanda antes de fechar.");

      const { error } = await supabase
        .from("comandas")
        .update({
          status: "aguardando_pagamento",
          subtotal,
          desconto: descontoNumero,
          acrescimo: acrescimoNumero,
          total,
        })
        .eq("id", comandaId)
        .eq("id_salao", idSalao);

      if (error) throw error;

      setStatus("aguardando_pagamento");
      setMsg("Comanda enviada para o caixa.");
    } catch (e: any) {
      console.error(e);
      setErro(e.message || "Erro ao enviar comanda para pagamento.");
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

    <div className="bg-white">
        <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-zinc-300">Comanda</p>
                <h1 className="mt-2 text-2xl font-bold md:text-3xl">
                  {modo === "novo" ? "Nova Comanda" : `Comanda #${numero}`}
                </h1>
          <p className="mt-2 text-sm text-zinc-500">
                  Controle atendimento, consumo, serviços, produtos e fechamento.
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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Cliente</label>
                    <select
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                    >
                      <option value="">Selecione</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                    >
                      <option value="aberta">Aberta</option>
                      <option value="em_atendimento">Em atendimento</option>
                      <option value="aguardando_pagamento">Aguardando pagamento</option>
                      <option value="fechada">Fechada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Observações</label>
                    <textarea
                      rows={3}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-zinc-900">Itens da comanda</h2>

                  <button
                    type="button"
                    onClick={() => setItemModalOpen(true)}
                    className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white"
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
                            Qtd: {Number(item.quantidade).toFixed(2)} • Unit: R$ {Number(item.valor_unitario).toFixed(2)}
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
                            onClick={() => removerItem(item.id)}
                            className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
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
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Desconto</label>
                    <input
                      value={desconto}
                      onChange={(e) => setDesconto(formatMoneyInput(e.target.value))}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Acréscimo</label>
                    <input
                      value={acrescimo}
                      onChange={(e) => setAcrescimo(formatMoneyInput(e.target.value))}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                    />
                  </div>

                  <Info label="Total" value={formatMoney(total)} />
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={handleSalvar}
                    disabled={saving}
                    className="w-full rounded-2xl bg-zinc-900 px-5 py-3 font-semibold text-white"
                  >
                    {saving ? "Salvando..." : modo === "novo" ? "Salvar comanda" : "Atualizar comanda"}
                  </button>

                  <button
                    type="button"
                    onClick={fecharComanda}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-3 font-semibold text-zinc-700"
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
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-zinc-900">{value}</div>
    </div>
  );
}
