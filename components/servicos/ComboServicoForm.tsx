"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Layers3, Plus, Scissors, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { parseMoneyToNumber } from "@/lib/utils/serviceMasks";
import {
  allocateComboUnitPrices,
  buildComboResumo,
  intersectLinkedProfessionals,
  normalizeComboComponents,
} from "@/lib/servicos/combo-utils";
import type { CategoriaServico, ComboServicoItemState } from "@/types/servicos";

type BaseServico = {
  id: string;
  nome: string;
  categoria?: string | null;
  duracao_minutos?: number | null;
  preco?: number | null;
  preco_padrao?: number | null;
  custo_produto?: number | null;
  profissionais_vinculados?: string[];
};

type ComboItemForm = {
  id_servico_item: string;
  ordem: number;
};

type ServicoBaseRow = BaseServico & {
  eh_combo?: boolean | null;
};

type ComboServicoRow = {
  id: string;
  nome?: string | null;
  descricao?: string | null;
  preco_padrao?: number | null;
  ativo?: boolean | null;
  status?: string | null;
  id_categoria?: string | null;
  combo_resumo?: string | null;
  eh_combo?: boolean | null;
};

type ComboServicoItemRow = {
  id_servico_item: string;
  ordem?: number | null;
  preco_base?: number | null;
  percentual_rateio?: number | null;
};

function formatMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  const number = Number(digits || 0) / 100;
  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const INITIAL_ITEMS: ComboItemForm[] = [
  { id_servico_item: "", ordem: 1 },
  { id_servico_item: "", ordem: 2 },
];

export default function ComboServicoForm({ modo }: { modo: "novo" | "editar" }) {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const comboId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [statusAtivo, setStatusAtivo] = useState(true);
  const [precoCombo, setPrecoCombo] = useState("");
  const [idCategoria, setIdCategoria] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [categorias, setCategorias] = useState<CategoriaServico[]>([]);
  const [servicosBase, setServicosBase] = useState<BaseServico[]>([]);
  const [comboItens, setComboItens] = useState<ComboItemForm[]>(INITIAL_ITEMS);
  const [vinculosPorServico, setVinculosPorServico] = useState<Map<string, string[]>>(
    new Map()
  );

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, comboId]);

  const comboSelecionado = useMemo(
    () =>
      comboItens
        .map((item) => servicosBase.find((servico) => servico.id === item.id_servico_item))
        .filter((item): item is BaseServico => Boolean(item)),
    [comboItens, servicosBase]
  );

  const comboNormalizado = useMemo(() => {
    return normalizeComboComponents(
      comboSelecionado.map((item, index) => ({
        id: item.id,
        nome: item.nome,
        ordem: comboItens[index]?.ordem ?? index + 1,
        preco_base: Number(item.preco_padrao ?? item.preco ?? 0),
      }))
    );
  }, [comboItens, comboSelecionado]);

  const resumoCombo = useMemo(
    () => buildComboResumo(comboSelecionado.map((item) => item.nome)),
    [comboSelecionado]
  );

  const precoFinalNumero = useMemo(
    () => parseMoneyToNumber(precoCombo),
    [precoCombo]
  );

  const valoresRateados = useMemo(
    () => allocateComboUnitPrices(precoFinalNumero, comboNormalizado),
    [comboNormalizado, precoFinalNumero]
  );

  const duracaoTotal = useMemo(
    () =>
      comboSelecionado.reduce(
        (acc, item) => acc + Number(item.duracao_minutos || 0),
        0
      ),
    [comboSelecionado]
  );

  const custoTotal = useMemo(
    () =>
      comboSelecionado.reduce(
        (acc, item) => acc + Number(item.custo_produto || 0),
        0
      ),
    [comboSelecionado]
  );

  const profissionaisIntersectados = useMemo(
    () =>
      intersectLinkedProfessionals(
        comboSelecionado.map((item) => item.id),
        vinculosPorServico
      ),
    [comboSelecionado, vinculosPorServico]
  );

  async function bootstrap() {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const usuario = await getUsuarioLogado();
      if (!usuario?.idSalao) {
        throw new Error("Nao foi possivel identificar o salao.");
      }

      setIdSalao(usuario.idSalao);

      const [categoriasRes, servicosRes, vinculosRes] = await Promise.all([
        supabase
          .from("servicos_categorias")
          .select("id, nome")
          .eq("id_salao", usuario.idSalao)
          .eq("ativo", true)
          .order("nome", { ascending: true }),
        supabase
          .from("servicos")
          .select(
            "id, nome, categoria, duracao_minutos, preco, preco_padrao, custo_produto, eh_combo"
          )
          .eq("id_salao", usuario.idSalao)
          .eq("ativo", true)
          .order("nome", { ascending: true }),
        supabase
          .from("profissional_servicos")
          .select("id_servico, id_profissional, ativo")
          .eq("id_salao", usuario.idSalao)
          .eq("ativo", true),
      ]);

      if (categoriasRes.error) throw categoriasRes.error;
      if (servicosRes.error) throw servicosRes.error;
      if (vinculosRes.error) throw vinculosRes.error;

      const mapaVinculos = new Map<string, string[]>();
      ((vinculosRes.data || []) as { id_servico: string; id_profissional: string }[]).forEach(
        (item) => {
          const lista = mapaVinculos.get(item.id_servico) || [];
          lista.push(item.id_profissional);
          mapaVinculos.set(item.id_servico, lista);
        }
      );

      const base = ((servicosRes.data || []) as unknown as ServicoBaseRow[])
        .filter((item) => !item.eh_combo)
        .map((item) => ({
          ...item,
          profissionais_vinculados: mapaVinculos.get(item.id) || [],
        })) as BaseServico[];

      setCategorias((categoriasRes.data as CategoriaServico[]) || []);
      setServicosBase(base);
      setVinculosPorServico(mapaVinculos);

      if (modo === "editar" && comboId) {
        const { data: comboRowRaw, error: comboError } = await supabase
          .from("servicos")
          .select(
            "id, nome, descricao, preco_padrao, ativo, status, id_categoria, combo_resumo, eh_combo"
          )
          .eq("id", comboId)
          .eq("id_salao", usuario.idSalao)
          .maybeSingle();

        if (comboError) throw comboError;
        const comboRow = comboRowRaw as ComboServicoRow | null;
        if (!comboRow?.id) throw new Error("Combo nao encontrado.");
        if (!comboRow.eh_combo) throw new Error("Este servico nao e um combo.");

        const { data: itensRows, error: itensError } = await supabase
          .from("servicos_combo_itens")
          .select("id_servico_item, ordem, preco_base, percentual_rateio")
          .eq("id_salao", usuario.idSalao)
          .eq("id_servico_combo", comboId)
          .eq("ativo", true)
          .order("ordem", { ascending: true });

        if (itensError) throw itensError;

        setNome(comboRow.nome || "");
        setDescricao(comboRow.descricao || "");
        setPrecoCombo(
          Number(comboRow.preco_padrao || 0).toFixed(2).replace(".", ",")
        );
        setStatusAtivo(Boolean(comboRow.ativo ?? comboRow.status === "ativo"));
        setIdCategoria(comboRow.id_categoria || "");
        setComboItens(
          ((itensRows || []) as unknown as ComboServicoItemRow[]).map((item, index) => ({
            id_servico_item: item.id_servico_item,
            ordem: Number(item.ordem || index + 1),
          }))
        );
      }
    } catch (error: unknown) {
      console.error(error);
      setErro(error instanceof Error ? error.message : "Erro ao carregar combo.");
    } finally {
      setLoading(false);
    }
  }

  function updateComboItem(index: number, field: keyof ComboItemForm, value: string | number) {
    setComboItens((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addComboItem() {
    setComboItens((prev) => [
      ...prev,
      { id_servico_item: "", ordem: prev.length + 1 },
    ]);
  }

  function removeComboItem(index: number) {
    setComboItens((prev) =>
      prev
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({ ...item, ordem: itemIndex + 1 }))
    );
  }

  async function salvar() {
    try {
      setSaving(true);
      setErro("");
      setMsg("");

      if (!nome.trim()) {
        throw new Error("Informe o nome do combo.");
      }

      if (comboSelecionado.length < 2) {
        throw new Error("Selecione pelo menos dois servicos para o combo.");
      }

      if (precoFinalNumero <= 0) {
        throw new Error("Informe um preco final valido para o combo.");
      }

      const categoriaSelecionada =
        idCategoria === "__nova__"
          ? null
          : categorias.find((item) => item.id === idCategoria) || null;

      const comboItensPayload: ComboServicoItemState[] = comboNormalizado.map((item) => ({
        id_servico_item: item.id,
        ordem: item.ordem ?? 0,
        preco_base: item.precoBase,
        percentual_rateio: item.percentualRateio,
      }));

      const vinculos = profissionaisIntersectados.map((idProfissional) => ({
        id_profissional: idProfissional,
        ativo: true,
        duracao_minutos: duracaoTotal,
      }));

      const response = await fetch("/api/servicos/processar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idSalao,
          acao: "salvar",
          servico: {
            id: modo === "editar" ? comboId : null,
            id_salao: idSalao,
            nome: nome.trim(),
            id_categoria:
              idCategoria === "__nova__"
                ? "__nova__"
                : categoriaSelecionada?.id || null,
            categoria:
              idCategoria === "__nova__"
                ? novaCategoria.trim() || null
                : categoriaSelecionada?.nome || null,
            descricao: descricao.trim() || null,
            gatilho_retorno_dias: null,
            duracao_minutos: duracaoTotal,
            pausa_minutos: 0,
            recurso_nome: null,
            preco_padrao: precoFinalNumero,
            preco_variavel: false,
            preco_minimo: null,
            custo_produto: custoTotal,
            comissao_percentual_padrao: 0,
            comissao_assistente_percentual: 0,
            base_calculo: "bruto",
            desconta_taxa_maquininha: false,
            exige_avaliacao: false,
            status: statusAtivo ? "ativo" : "inativo",
            ativo: statusAtivo,
            app_cliente_visivel: false,
            eh_combo: true,
            combo_resumo: resumoCombo,
          },
          novaCategoria: idCategoria === "__nova__" ? novaCategoria.trim() : null,
          vinculos,
          consumos: [],
          combo_itens: comboItensPayload,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Erro ao salvar combo.");
      }

      if (modo === "novo") {
        router.push("/servicos");
        return;
      }

      setMsg("Combo atualizado com sucesso.");
    } catch (error: unknown) {
      console.error(error);
      setErro(error instanceof Error ? error.message : "Erro ao salvar combo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          Carregando combo de servicos...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Catalogo premium
              </div>
              <h1 className="mt-2 text-2xl font-bold md:text-3xl">
                {modo === "novo" ? "Criar combo de servicos" : "Editar combo de servicos"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                Monte um preco final unico usando varios servicos do catalogo.
                A agenda enxerga o combo como um servico so, e o caixa divide
                internamente para comissao e relatorio.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/servicos")}
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
            >
              Voltar para servicos
            </button>
          </div>
        </section>

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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome do combo">
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                    placeholder="Ex.: Combo mechas + corte + tratamento"
                  />
                </Field>

                <Field label="Preco final do combo">
                  <input
                    value={precoCombo}
                    onChange={(e) => setPrecoCombo(formatMoneyInput(e.target.value))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                    placeholder="0,00"
                  />
                </Field>

                <Field label="Categoria">
                  <select
                    value={idCategoria}
                    onChange={(e) => setIdCategoria(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                  >
                    <option value="">Sem categoria</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                    <option value="__nova__">Criar nova categoria</option>
                  </select>
                </Field>

                <Field label="Status">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStatusAtivo(true)}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        statusAtivo
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-300 bg-white text-zinc-700"
                      }`}
                    >
                      Ativo
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusAtivo(false)}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        !statusAtivo
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-300 bg-white text-zinc-700"
                      }`}
                    >
                      Inativo
                    </button>
                  </div>
                </Field>

                {idCategoria === "__nova__" ? (
                  <div className="md:col-span-2">
                    <Field label="Nova categoria">
                      <input
                        value={novaCategoria}
                        onChange={(e) => setNovaCategoria(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                        placeholder="Nome da nova categoria"
                      />
                    </Field>
                  </div>
                ) : null}

                <div className="md:col-span-2">
                  <Field label="Descricao">
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="min-h-[120px] w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                      placeholder="Explique quando usar o combo, o resultado esperado e o que esta incluso."
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Estrutura do combo
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-zinc-950">
                    Servicos internos
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Escolha os servicos que formam o combo. O valor do combo sera
                    rateado automaticamente entre eles para vendas e comissoes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addComboItem}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
                >
                  <Plus size={16} />
                  Adicionar servico
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {comboItens.map((item, index) => {
                  const servicoAtual = servicosBase.find(
                    (servico) => servico.id === item.id_servico_item
                  );

                  return (
                    <div
                      key={`${index}-${item.id_servico_item}`}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                    >
                      <div className="grid gap-4 lg:grid-cols-[110px_minmax(0,1fr)_120px]">
                        <Field label="Ordem">
                          <input
                            type="number"
                            min={1}
                            value={item.ordem}
                            onChange={(e) =>
                              updateComboItem(index, "ordem", Number(e.target.value || 1))
                            }
                            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                          />
                        </Field>

                        <Field label="Servico do combo">
                          <select
                            value={item.id_servico_item}
                            onChange={(e) =>
                              updateComboItem(index, "id_servico_item", e.target.value)
                            }
                            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">Selecione um servico</option>
                            {servicosBase.map((servico) => (
                              <option key={servico.id} value={servico.id}>
                                {servico.nome}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeComboItem(index)}
                            disabled={comboItens.length <= 2}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                            Remover
                          </button>
                        </div>
                      </div>

                      {servicoAtual ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <MiniInfo
                            label="Preco base"
                            value={formatCurrency(
                              Number(servicoAtual.preco_padrao ?? servicoAtual.preco ?? 0)
                            )}
                          />
                          <MiniInfo
                            label="Duracao"
                            value={`${Number(servicoAtual.duracao_minutos || 0)} min`}
                          />
                          <MiniInfo
                            label="Rateio projetado"
                            value={
                              comboNormalizado[index]
                                ? `${comboNormalizado[index].percentualRateio.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}%`
                                : "-"
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-700">
                  <Layers3 size={18} />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Resumo do combo
                  </div>
                  <h2 className="mt-1 text-lg font-bold text-zinc-950">
                    {nome.trim() || "Novo combo"}
                  </h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <MiniInfo label="Resumo rapido" value={resumoCombo || "Sem servicos selecionados"} />
                <MiniInfo label="Duracao total" value={`${duracaoTotal} min`} />
                <MiniInfo label="Preco final" value={formatCurrency(precoFinalNumero)} />
                <MiniInfo label="Custo somado" value={formatCurrency(custoTotal)} />
                <MiniInfo
                  label="Profissionais liberados"
                  value={`${profissionaisIntersectados.length}`}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Rateio financeiro
              </div>
              <h2 className="mt-2 text-lg font-bold text-zinc-950">
                Como o combo vai entrar no caixa
              </h2>

              <div className="mt-4 space-y-3">
                {comboNormalizado.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
                    Selecione os servicos para ver o rateio do combo.
                  </div>
                ) : (
                  comboNormalizado.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                        <Scissors size={14} />
                        {item.nome}
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">
                        {item.percentualRateio.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        % do combo
                      </div>
                      <div className="mt-2 text-sm font-semibold text-zinc-900">
                        {formatCurrency(valoresRateados[index] || 0)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <button
              type="button"
              onClick={salvar}
              disabled={saving}
              className="w-full rounded-2xl bg-zinc-900 px-5 py-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving
                ? "Salvando combo..."
                : modo === "novo"
                  ? "Salvar combo"
                  : "Atualizar combo"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}
