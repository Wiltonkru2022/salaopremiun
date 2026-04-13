"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { maskMoneyInput, parseMoneyToNumber } from "@/lib/utils/serviceMasks";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";

type ServicoFormProps = {
  modo: "novo" | "editar";
};

type Profissional = {
  id: string;
  nome: string;
};

type Produto = {
  id: string;
  nome: string;
  unidade_medida?: string | null;
};

type Recurso = {
  id: string;
  nome: string;
};

type VinculoProfissional = {
  id_profissional: string;
  ativo: boolean;
  duracao_minutos: string;
  preco_personalizado: string;
  comissao_percentual: string;
  comissao_assistente_percentual: string;
  base_calculo: string;
  desconta_taxa_maquininha: boolean;
};

type ProdutoConsumo = {
  id_produto: string;
  quantidade_consumo: string;
  unidade_medida: string;
  custo_estimado: string;
  ativo: boolean;
};

type ServicoState = {
  id?: string;
  id_salao: string;
  nome: string;
  categoria: string;
  descricao: string;
  gatilho_retorno_dias: string;
  duracao_minutos: string;
  pausa_minutos: string;
  recurso_nome: string;
  preco_padrao: string;
  preco_variavel: boolean;
  preco_minimo: string;
  custo_produto: string;
  comissao_percentual_padrao: string;
  comissao_assistente_percentual: string;
  base_calculo: string;
  desconta_taxa_maquininha: boolean;
  exige_avaliacao: boolean;
  status: string;
  ativo: boolean;
};

const initialState: ServicoState = {
  id_salao: "",
  nome: "",
  categoria: "",
  descricao: "",
  gatilho_retorno_dias: "",
  duracao_minutos: "60",
  pausa_minutos: "0",
  recurso_nome: "",
  preco_padrao: "",
  preco_variavel: false,
  preco_minimo: "",
  custo_produto: "",
  comissao_percentual_padrao: "",
  comissao_assistente_percentual: "",
  base_calculo: "bruto",
  desconta_taxa_maquininha: false,
  exige_avaliacao: false,
  status: "ativo",
  ativo: true,
};

function formatMoneyFromDb(value: unknown) {
  if (value === null || value === undefined || value === "") return "";

  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));

  if (!Number.isFinite(n)) return "";

  return n.toFixed(2).replace(".", ",");
}

export default function ServicoForm({ modo }: ServicoFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const servicoId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");

  const [servico, setServico] = useState<ServicoState>(initialState);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [vinculos, setVinculos] = useState<VinculoProfissional[]>([]);
  const [consumos, setConsumos] = useState<ProdutoConsumo[]>([]);

  const precoPadraoNumero = useMemo(
    () => parseMoneyToNumber(servico.preco_padrao),
    [servico.preco_padrao]
  );

  const custoProdutoNumero = useMemo(
    () => parseMoneyToNumber(servico.custo_produto),
    [servico.custo_produto]
  );

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, servicoId]);

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
      throw new Error("Não foi possível identificar o salão do usuário.");
    }

    setIdSalao(usuarioLogado.idSalao);
    setServico((prev) => ({ ...prev, id_salao: usuarioLogado.idSalao }));

    const { data: profissionaisRows, error: profError } = await supabase
      .from("profissionais")
      .select("id, nome")
      .eq("id_salao", usuarioLogado.idSalao)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (profError) throw profError;

    const { data: produtosRows, error: prodError } = await supabase
      .from("produtos")
      .select("id, nome, unidade_medida")
      .eq("id_salao", usuarioLogado.idSalao)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (prodError) throw prodError;

    const { data: recursosRows, error: recError } = await supabase
      .from("recursos_agenda")
      .select("id, nome")
      .eq("id_salao", usuarioLogado.idSalao)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (recError) throw recError;

    const listaProfissionais = (profissionaisRows as Profissional[]) || [];
    const listaProdutos = (produtosRows as Produto[]) || [];
    const listaRecursos = (recursosRows as Recurso[]) || [];

    setProfissionais(listaProfissionais);
    setProdutos(listaProdutos);
    setRecursos(listaRecursos);

    if (modo === "novo") {
      setVinculos(
        listaProfissionais.map((p) => ({
          id_profissional: p.id,
          ativo: false,
          duracao_minutos: "",
          preco_personalizado: "",
          comissao_percentual: "",
          comissao_assistente_percentual: "",
          base_calculo: "",
          desconta_taxa_maquininha: false,
        }))
      );
      setConsumos([]);
    }

    if (modo === "editar" && servicoId) {
      await carregarServico(
        servicoId,
        usuarioLogado.idSalao,
        listaProfissionais,
        listaProdutos
      );
    }
  } catch (e: any) {
    console.error("Erro no bootstrap do serviço:", e);
    setErro(e.message || "Erro ao carregar formulário.");
  } finally {
    setLoading(false);
  }
}

  async function carregarServico(
    id: string,
    salaoId: string,
    listaProfissionais: Profissional[],
    _listaProdutos: Produto[]
  ) {
    const { data: row, error } = await supabase
      .from("servicos")
      .select("*")
      .eq("id", id)
      .eq("id_salao", salaoId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar serviço:", error);
      throw new Error("Falha ao buscar serviço.");
    }

    if (!row) {
      throw new Error("Serviço não encontrado.");
    }

    setServico({
      id: row.id,
      id_salao: row.id_salao,
      nome: row.nome || "",
      categoria: row.categoria || "",
      descricao: row.descricao || "",
      gatilho_retorno_dias: row.gatilho_retorno_dias?.toString() || "",
      duracao_minutos: row.duracao_minutos?.toString() || "60",
      pausa_minutos: row.pausa_minutos?.toString() || "0",
      recurso_nome: row.recurso_nome || "",
      preco_padrao: formatMoneyFromDb(row.preco_padrao),
      preco_variavel: row.preco_variavel ?? false,
      preco_minimo: formatMoneyFromDb(row.preco_minimo),
      custo_produto: formatMoneyFromDb(row.custo_produto),
      comissao_percentual_padrao:
        row.comissao_percentual_padrao?.toString() || "",
      comissao_assistente_percentual:
        row.comissao_assistente_percentual?.toString() || "",
      base_calculo: row.base_calculo || "bruto",
      desconta_taxa_maquininha: row.desconta_taxa_maquininha ?? false,
      exige_avaliacao: row.exige_avaliacao ?? false,
      status: row.status || "ativo",
      ativo: row.ativo ?? true,
    });

    const { data: vinculosRows, error: vinculosError } = await supabase
      .from("profissional_servicos")
      .select("*")
      .eq("id_servico", id);

    if (vinculosError) {
      console.error("Erro ao buscar vínculos:", vinculosError);
      throw new Error("Falha ao buscar vínculos do serviço.");
    }

    const mapaVinculos = new Map(
      ((vinculosRows || []) as any[]).map((v) => [v.id_profissional, v])
    );

    setVinculos(
      listaProfissionais.map((p) => {
        const v: any = mapaVinculos.get(p.id);

        return {
          id_profissional: p.id,
          ativo: v?.ativo ?? false,
          duracao_minutos: v?.duracao_minutos?.toString() || "",
          preco_personalizado: formatMoneyFromDb(v?.preco_personalizado),
          comissao_percentual: v?.comissao_percentual?.toString() || "",
          comissao_assistente_percentual:
            v?.comissao_assistente_percentual?.toString() || "",
          base_calculo: v?.base_calculo || "",
          desconta_taxa_maquininha: v?.desconta_taxa_maquininha ?? false,
        };
      })
    );

    const { data: consumoRows, error: consumoError } = await supabase
      .from("produto_servico_consumo")
      .select("*")
      .eq("id_servico", id);

    if (consumoError) {
      console.error("Erro ao buscar consumo de produtos:", consumoError);
      throw new Error("Falha ao buscar consumo de produtos.");
    }

    setConsumos(
      ((consumoRows || []) as any[]).map((c) => ({
        id_produto: c.id_produto,
        quantidade_consumo: c.quantidade_consumo?.toString() || "",
        unidade_medida: c.unidade_medida || "",
        custo_estimado: formatMoneyFromDb(c.custo_estimado),
        ativo: c.ativo ?? true,
      }))
    );
  }

  function setField<K extends keyof ServicoState>(
    field: K,
    value: ServicoState[K]
  ) {
    setServico((prev) => ({ ...prev, [field]: value }));
  }

  function updateVinculo(
    idProfissional: string,
    field: keyof VinculoProfissional,
    value: any
  ) {
    setVinculos((prev) =>
      prev.map((item) =>
        item.id_profissional === idProfissional
          ? { ...item, [field]: value }
          : item
      )
    );
  }

  function adicionarConsumo() {
    setConsumos((prev) => [
      ...prev,
      {
        id_produto: "",
        quantidade_consumo: "",
        unidade_medida: "",
        custo_estimado: "",
        ativo: true,
      },
    ]);
  }

  function removerConsumo(index: number) {
    setConsumos((prev) => prev.filter((_, i) => i !== index));
  }

  function updateConsumo(
    index: number,
    field: keyof ProdutoConsumo,
    value: any
  ) {
    setConsumos((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function salvar() {
    try {
      setSaving(true);
      setErro("");
      setMsg("");

      if (!servico.nome.trim()) {
        throw new Error("Informe o nome do serviço.");
      }

      const payload = {
        id_salao: idSalao,
        nome: servico.nome.trim(),
        categoria: servico.categoria.trim() || null,
        descricao: servico.descricao.trim() || null,
        gatilho_retorno_dias: servico.gatilho_retorno_dias
          ? Number(servico.gatilho_retorno_dias)
          : null,
        duracao_minutos: Number(servico.duracao_minutos || 0),
        pausa_minutos: Number(servico.pausa_minutos || 0),
        recurso_nome: servico.recurso_nome.trim() || null,
        preco_padrao: parseMoneyToNumber(servico.preco_padrao),
        preco_variavel: servico.preco_variavel,
        preco_minimo: servico.preco_minimo
          ? parseMoneyToNumber(servico.preco_minimo)
          : null,
        custo_produto: parseMoneyToNumber(servico.custo_produto),
        comissao_percentual_padrao: servico.comissao_percentual_padrao
          ? Number(servico.comissao_percentual_padrao)
          : null,
        comissao_assistente_percentual: Number(
          servico.comissao_assistente_percentual || 0
        ),
        base_calculo: servico.base_calculo || "bruto",
        desconta_taxa_maquininha: servico.desconta_taxa_maquininha,
        exige_avaliacao: servico.exige_avaliacao,
        status: servico.ativo ? "ativo" : "inativo",
        ativo: servico.ativo,
      };

      let idServico = servico.id || "";

      if (modo === "novo") {
        const { data, error } = await supabase
          .from("servicos")
          .insert(payload)
          .select("id")
          .limit(1);

        if (error) throw error;

        idServico = data?.[0]?.id;
        if (!idServico) {
          throw new Error("Não foi possível obter o ID do serviço.");
        }
      } else {
        const { error } = await supabase
          .from("servicos")
          .update(payload)
          .eq("id", servico.id)
          .eq("id_salao", idSalao);

        if (error) throw error;
        idServico = servico.id || "";
      }

      const { error: deleteVinculosError } = await supabase
        .from("profissional_servicos")
        .delete()
        .eq("id_servico", idServico);

      if (deleteVinculosError) throw deleteVinculosError;

      const vinculosAtivos = vinculos
        .filter((v) => v.ativo)
        .map((v) => ({
          id_salao: idSalao,
          id_profissional: v.id_profissional,
          id_servico: idServico,
          ativo: true,
          duracao_minutos: v.duracao_minutos
            ? Number(v.duracao_minutos)
            : null,
          preco_personalizado: v.preco_personalizado
            ? parseMoneyToNumber(v.preco_personalizado)
            : null,
          comissao_percentual: v.comissao_percentual
            ? Number(v.comissao_percentual)
            : null,
          comissao_assistente_percentual: v.comissao_assistente_percentual
            ? Number(v.comissao_assistente_percentual)
            : null,
          base_calculo: v.base_calculo || null,
          desconta_taxa_maquininha: v.desconta_taxa_maquininha,
        }));

      if (vinculosAtivos.length > 0) {
        const { error: vinculoError } = await supabase
          .from("profissional_servicos")
          .insert(vinculosAtivos);

        if (vinculoError) throw vinculoError;
      }

      const { error: deleteConsumoError } = await supabase
        .from("produto_servico_consumo")
        .delete()
        .eq("id_servico", idServico);

      if (deleteConsumoError) throw deleteConsumoError;

      const consumosValidos = consumos
        .filter((c) => c.id_produto && Number(c.quantidade_consumo || 0) > 0)
        .map((c) => ({
          id_salao: idSalao,
          id_servico: idServico,
          id_produto: c.id_produto,
          quantidade_consumo: Number(c.quantidade_consumo || 0),
          unidade_medida: c.unidade_medida || null,
          custo_estimado: c.custo_estimado
            ? parseMoneyToNumber(c.custo_estimado)
            : null,
          ativo: true,
        }));

      if (consumosValidos.length > 0) {
        const { error: consumoError } = await supabase
          .from("produto_servico_consumo")
          .insert(consumosValidos);

        if (consumoError) throw consumoError;
      }

      if (modo === "novo") {
        router.push("/servicos");
        return;
      }

      setMsg("Serviço atualizado com sucesso.");
    } catch (e: any) {
      console.error("Erro ao salvar serviço:", e);
      setErro(e.message || "Erro ao salvar serviço.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          Carregando cadastro de serviço...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 text-white shadow-xl">
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">
            {modo === "novo" ? "Novo Serviço" : "Editar Serviço"}
          </h1>
          <p className="mt-2 text-sm text-zinc-300">
            Cadastro completo de serviço com agenda, preço, comissão e consumo.
          </p>
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

        <div className="flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/servicos")}
            className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
          >
            Voltar para lista
          </button>

          <button
            type="button"
            onClick={salvar}
            disabled={saving}
            className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving
              ? "Salvando..."
              : modo === "novo"
              ? "Salvar serviço"
              : "Atualizar serviço"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card
              title="1. Dados básicos e descrição"
              subtitle="O que está sendo vendido"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Nome do serviço"
                  value={servico.nome}
                  onChange={(v) => setField("nome", v)}
                  required
                />
                <Input
                  label="Categoria"
                  value={servico.categoria}
                  onChange={(v) => setField("categoria", v)}
                />
                <Input
                  label="Gatilho de retorno (dias)"
                  value={servico.gatilho_retorno_dias}
                  onChange={(v) => setField("gatilho_retorno_dias", v)}
                />
                <Select
                  label="Recurso específico"
                  value={servico.recurso_nome}
                  onChange={(v) => setField("recurso_nome", v)}
                  options={[
                    { value: "", label: "Nenhum" },
                    ...recursos.map((r) => ({ value: r.nome, label: r.nome })),
                  ]}
                />

                <div className="md:col-span-2">
                  <Textarea
                    label="Descrição do serviço"
                    value={servico.descricao}
                    onChange={(v) => setField("descricao", v)}
                  />
                </div>
              </div>
            </Card>

            <Card title="2. Tempo e dinâmica" subtitle="Agenda e pausas">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label="Duração total (min)"
                  value={servico.duracao_minutos}
                  onChange={(v) => setField("duracao_minutos", v)}
                />
                <Input
                  label="Tempo de pausa (min)"
                  value={servico.pausa_minutos}
                  onChange={(v) => setField("pausa_minutos", v)}
                />
                <Switch
                  label="Exige avaliação"
                  checked={servico.exige_avaliacao}
                  onChange={(v) => setField("exige_avaliacao", v)}
                />
              </div>
            </Card>

            <Card title="3. Precificação e custos" subtitle="Lucro real do serviço">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Preço padrão"
                  value={servico.preco_padrao}
                  onChange={(v) => setField("preco_padrao", maskMoneyInput(v))}
                />

                <Input
                  label="Preço mínimo"
                  value={servico.preco_minimo}
                  onChange={(v) => setField("preco_minimo", maskMoneyInput(v))}
                />

                <Input
                  label="Custo de produto"
                  value={servico.custo_produto}
                  onChange={(v) => setField("custo_produto", maskMoneyInput(v))}
                />

                <Switch
                  label="Preço variável / a partir de"
                  checked={servico.preco_variavel}
                  onChange={(v) => setField("preco_variavel", v)}
                />
              </div>
            </Card>

            <Card title="4. Regras de comissão" subtitle="Padrão do serviço">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Comissão profissional (%)"
                  value={servico.comissao_percentual_padrao}
                  onChange={(v) =>
                    setField("comissao_percentual_padrao", v)
                  }
                />

                <Input
                  label="Comissão assistente (%)"
                  value={servico.comissao_assistente_percentual}
                  onChange={(v) =>
                    setField("comissao_assistente_percentual", v)
                  }
                />

                <Select
                  label="Base de cálculo"
                  value={servico.base_calculo}
                  onChange={(v) => setField("base_calculo", v)}
                  options={[
                    { value: "bruto", label: "Bruto" },
                    { value: "liquido", label: "Líquido" },
                  ]}
                />

                <Switch
                  label="Desconta taxa da maquininha"
                  checked={servico.desconta_taxa_maquininha}
                  onChange={(v) => setField("desconta_taxa_maquininha", v)}
                />
              </div>
            </Card>

            <Card
              title="5. Profissionais vinculados"
              subtitle="Onde você controla 40%, 50% etc."
            >
              <div className="space-y-4">
                {profissionais.map((profissional) => {
                  const vinculo = vinculos.find(
                    (v) => v.id_profissional === profissional.id
                  );
                  if (!vinculo) return null;

                  return (
                    <div
                      key={profissional.id}
                      className="rounded-2xl border border-zinc-200 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-zinc-900">
                            {profissional.nome}
                          </p>
                          <p className="text-sm text-zinc-500">
                            Ative para permitir agendamento deste serviço com
                            esse profissional
                          </p>
                        </div>

                        <input
                          type="checkbox"
                          checked={vinculo.ativo}
                          onChange={(e) =>
                            updateVinculo(
                              profissional.id,
                              "ativo",
                              e.target.checked
                            )
                          }
                        />
                      </div>

                      {vinculo.ativo && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <Input
                            label="Duração personalizada"
                            value={vinculo.duracao_minutos}
                            onChange={(v) =>
                              updateVinculo(
                                profissional.id,
                                "duracao_minutos",
                                v
                              )
                            }
                          />

                          <Input
                            label="Preço personalizado"
                            value={vinculo.preco_personalizado}
                            onChange={(v) =>
                              updateVinculo(
                                profissional.id,
                                "preco_personalizado",
                                maskMoneyInput(v)
                              )
                            }
                          />

                          <Input
                            label="Comissão (%)"
                            value={vinculo.comissao_percentual}
                            onChange={(v) =>
                              updateVinculo(
                                profissional.id,
                                "comissao_percentual",
                                v
                              )
                            }
                          />

                          <Input
                            label="Comissão assistente (%)"
                            value={vinculo.comissao_assistente_percentual}
                            onChange={(v) =>
                              updateVinculo(
                                profissional.id,
                                "comissao_assistente_percentual",
                                v
                              )
                            }
                          />

                          <Select
                            label="Base cálculo"
                            value={vinculo.base_calculo}
                            onChange={(v) =>
                              updateVinculo(
                                profissional.id,
                                "base_calculo",
                                v
                              )
                            }
                            options={[
                              { value: "", label: "Usar padrão" },
                              { value: "bruto", label: "Bruto" },
                              { value: "liquido", label: "Líquido" },
                            ]}
                          />

                          <Switch
                            label="Desconta maquininha"
                            checked={vinculo.desconta_taxa_maquininha}
                            onChange={(v) =>
                              updateVinculo(
                                profissional.id,
                                "desconta_taxa_maquininha",
                                v
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card
              title="6. Consumo de produtos"
              subtitle="Base para baixar estoque automaticamente"
            >
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={adicionarConsumo}
                  className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white"
                >
                  Adicionar produto consumido
                </button>

                {consumos.map((consumo, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 p-4 md:grid-cols-4"
                  >
                    <Select
                      label="Produto"
                      value={consumo.id_produto}
                      onChange={(v) => {
                        const produto = produtos.find((p) => p.id === v);
                        updateConsumo(index, "id_produto", v);
                        updateConsumo(
                          index,
                          "unidade_medida",
                          produto?.unidade_medida || ""
                        );
                      }}
                      options={[
                        { value: "", label: "Selecione" },
                        ...produtos.map((p) => ({
                          value: p.id,
                          label: p.nome,
                        })),
                      ]}
                    />

                    <Input
                      label="Quantidade"
                      value={consumo.quantidade_consumo}
                      onChange={(v) =>
                        updateConsumo(index, "quantidade_consumo", v)
                      }
                    />

                    <Input
                      label="Unidade"
                      value={consumo.unidade_medida}
                      onChange={(v) =>
                        updateConsumo(index, "unidade_medida", v)
                      }
                    />

                    <Input
                      label="Custo estimado"
                      value={consumo.custo_estimado}
                      onChange={(v) =>
                        updateConsumo(
                          index,
                          "custo_estimado",
                          maskMoneyInput(v)
                        )
                      }
                    />

                    <div className="md:col-span-4">
                      <button
                        type="button"
                        onClick={() => removerConsumo(index)}
                        className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600"
                      >
                        Remover item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Resumo" subtitle="Visão rápida">
              <div className="space-y-4">
                <Info
                  label="Preço padrão"
                  value={`R$ ${precoPadraoNumero.toFixed(2)}`}
                />
                <Info
                  label="Custo produto"
                  value={`R$ ${custoProdutoNumero.toFixed(2)}`}
                />
                <Info
                  label="Lucro bruto estimado"
                  value={`R$ ${(precoPadraoNumero - custoProdutoNumero).toFixed(
                    2
                  )}`}
                />
              </div>
            </Card>

            <Card title="Status" subtitle="Controle do cadastro">
              <div className="space-y-4">
                <Select
                  label="Status"
                  value={servico.ativo ? "ativo" : "inativo"}
                  onChange={(v) => {
                    const ativo = v === "ativo";
                    setField("ativo", ativo);
                    setField("status", ativo ? "ativo" : "inativo");
                  }}
                  options={[
                    { value: "ativo", label: "Ativo" },
                    { value: "inativo", label: "Inativo" },
                  ]}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-zinc-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-zinc-700">{label}</label>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-zinc-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-zinc-900">{value}</p>
    </div>
  );
}