"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseMoneyToNumber } from "@/lib/utils/serviceMasks";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import {
  ServicoFormAgendaSection,
  ServicoFormComissaoSection,
  ServicoFormConsumoSection,
  ServicoFormGeralSection,
  ServicoFormPrecoSection,
  ServicoFormProfissionaisSection,
  ServicoFormResumoStatus,
} from "@/components/servicos/ServicoFormSections";
import type {
  CategoriaServico,
  ProdutoConsumoRow,
  ProdutoConsumoServico,
  ProdutoServico,
  ProfissionalServico,
  RecursoServico,
  ServicoProcessarBody,
  ServicoProcessarErrorResponse,
  ServicoProcessarPayload,
  ServicoProcessarResponse,
  ServicoState,
  VinculoProfissionalServico,
  VinculoServicoRow,
} from "@/types/servicos";

type ServicoFormProps = {
  modo: "novo" | "editar";
};

const initialState: ServicoState = {
  id_salao: "",
  nome: "",
  categoria: "",
  id_categoria: "",
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

function formatPercentPreview(value: string) {
  if (!value.trim()) return "Nao definido";

  return `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatBaseCalculoLabel(value: string) {
  return value === "liquido" ? "Liquido" : "Bruto";
}

function formatTaxaMaquininhaLabel(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "Usar padrao do servico";
  return value ? "Descontar taxa" : "Nao descontar taxa";
}

function hasRegraComissaoPersonalizada(vinculo: VinculoProfissionalServico) {
  return (
    vinculo.comissao_percentual.trim() !== "" ||
    vinculo.comissao_assistente_percentual.trim() !== "" ||
    vinculo.base_calculo.trim() !== "" ||
    vinculo.desconta_taxa_maquininha !== null
  );
}

function getTaxaMaquininhaSelectValue(value: boolean | null) {
  if (value === null) return "";
  return value ? "descontar" : "nao_descontar";
}

function parseTaxaMaquininhaSelectValue(value: string): boolean | null {
  if (value === "descontar") return true;
  if (value === "nao_descontar") return false;
  return null;
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
  const [categorias, setCategorias] = useState<CategoriaServico[]>([]);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [profissionais, setProfissionais] = useState<ProfissionalServico[]>([]);
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [recursos, setRecursos] = useState<RecursoServico[]>([]);
  const [vinculos, setVinculos] = useState<VinculoProfissionalServico[]>([]);
  const [consumos, setConsumos] = useState<ProdutoConsumoServico[]>([]);

  const precoPadraoNumero = useMemo(
    () => parseMoneyToNumber(servico.preco_padrao),
    [servico.preco_padrao]
  );

  const custoProdutoNumero = useMemo(
    () => parseMoneyToNumber(servico.custo_produto),
    [servico.custo_produto]
  );

  const vinculosAtivos = useMemo(
    () => vinculos.filter((item) => item.ativo),
    [vinculos]
  );

  const totalRegrasPersonalizadas = useMemo(
    () =>
      vinculosAtivos.filter((item) => hasRegraComissaoPersonalizada(item))
        .length,
    [vinculosAtivos]
  );

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, servicoId]);

  async function bootstrap() {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const usuarioLogado = await getUsuarioLogado();

      if (!usuarioLogado) {
        throw new Error("Usuario nao autenticado.");
      }

      if (!usuarioLogado.idSalao) {
        throw new Error("Nao foi possivel identificar o salao do usuario.");
      }

      setIdSalao(usuarioLogado.idSalao);
      setServico((prev) => ({ ...prev, id_salao: usuarioLogado.idSalao }));

      const { data: profissionaisRows, error: profError } = await supabase
        .from("profissionais")
        .select("id, nome")
        .eq("id_salao", usuarioLogado.idSalao)
        .eq("ativo", true)
        .or("tipo_profissional.is.null,tipo_profissional.eq.profissional")
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

      const { data: categoriasRows, error: categoriasError } = await supabase
        .from("servicos_categorias")
        .select("id, nome")
        .eq("id_salao", usuarioLogado.idSalao)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (categoriasError) throw categoriasError;

      const listaProfissionais = (profissionaisRows as ProfissionalServico[]) || [];
      const listaProdutos = (produtosRows as ProdutoServico[]) || [];

      setCategorias((categoriasRows as CategoriaServico[]) || []);
      setProfissionais(listaProfissionais);
      setProdutos(listaProdutos);
      setRecursos((recursosRows as RecursoServico[]) || []);

      if (modo === "novo") {
        setVinculos(
          listaProfissionais.map((profissional) => ({
            id_profissional: profissional.id,
            ativo: false,
            duracao_minutos: "",
            preco_personalizado: "",
            comissao_percentual: "",
            comissao_assistente_percentual: "",
            base_calculo: "",
            desconta_taxa_maquininha: null,
          }))
        );
        setConsumos([]);
      }

      if (modo === "editar" && servicoId) {
        await carregarServico(
          servicoId,
          usuarioLogado.idSalao,
          listaProfissionais
        );
      }
    } catch (e: unknown) {
      console.error("Erro no bootstrap do servico:", e);
      setErro(e instanceof Error ? e.message : "Erro ao carregar formulario.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarServico(
    id: string,
    salaoId: string,
    listaProfissionais: ProfissionalServico[]
  ) {
    const { data: row, error } = await supabase
      .from("servicos")
      .select("ativo, atualizado_em, base_calculo, categoria, comissao_assistente_percentual, comissao_percentual, comissao_percentual_padrao, created_at, criado_em, custo_produto, desconta_taxa_maquininha, descricao, duracao, duracao_minutos, exige_avaliacao, gatilho_retorno_dias, id, id_categoria, id_salao, nome, pausa_minutos, preco, preco_minimo, preco_padrao, preco_variavel, recurso_nome, status, updated_at")
      .eq("id", id)
      .eq("id_salao", salaoId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar servico:", error);
      throw new Error("Falha ao buscar servico.");
    }

    if (!row) {
      throw new Error("Servico nao encontrado.");
    }

    const rowIdSalao = row.id_salao;
    if (!rowIdSalao) {
      throw new Error("Servico sem salao vinculado.");
    }

    setServico({
      id: row.id,
      id_salao: rowIdSalao,
      nome: row.nome || "",
      categoria: row.categoria || "",
      id_categoria: row.id_categoria || "",
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
      .select("ativo, base_calculo, comissao_assistente_percentual, comissao_percentual, created_at, desconta_taxa_maquininha, duracao_minutos, id, id_profissional, id_salao, id_servico, ordem, preco_personalizado, updated_at")
      .eq("id_servico", id);

    if (vinculosError) {
      console.error("Erro ao buscar vinculos:", vinculosError);
      throw new Error("Falha ao buscar vinculos do servico.");
    }

    const mapaVinculos = new Map<string, VinculoServicoRow>(
      ((vinculosRows || []) as VinculoServicoRow[]).map((item) => [
        item.id_profissional,
        item,
      ])
    );

    setVinculos(
      listaProfissionais.map((profissional) => {
        const vinculo = mapaVinculos.get(profissional.id);

        return {
          id_profissional: profissional.id,
          ativo: vinculo?.ativo ?? false,
          duracao_minutos: vinculo?.duracao_minutos?.toString() || "",
          preco_personalizado: formatMoneyFromDb(vinculo?.preco_personalizado),
          comissao_percentual: vinculo?.comissao_percentual?.toString() || "",
          comissao_assistente_percentual:
            vinculo?.comissao_assistente_percentual?.toString() || "",
          base_calculo: vinculo?.base_calculo || "",
          desconta_taxa_maquininha:
            typeof vinculo?.desconta_taxa_maquininha === "boolean"
              ? vinculo.desconta_taxa_maquininha
              : null,
        };
      })
    );

    const { data: consumoRows, error: consumoError } = await supabase
      .from("produto_servico_consumo")
      .select("ativo, created_at, custo_estimado, id, id_produto, id_salao, id_servico, quantidade_consumo, unidade_medida, updated_at")
      .eq("id_servico", id);

    if (consumoError) {
      console.error("Erro ao buscar consumo de produtos:", consumoError);
      throw new Error("Falha ao buscar consumo de produtos.");
    }

    setConsumos(
      ((consumoRows || []) as ProdutoConsumoRow[]).map((consumo) => ({
        id_produto: consumo.id_produto,
        quantidade_consumo: consumo.quantidade_consumo?.toString() || "",
        unidade_medida: consumo.unidade_medida || "",
        custo_estimado: formatMoneyFromDb(consumo.custo_estimado),
        ativo: consumo.ativo ?? true,
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
    field: keyof VinculoProfissionalServico,
    value: VinculoProfissionalServico[keyof VinculoProfissionalServico]
  ) {
    setVinculos((prev) =>
      prev.map((item) =>
        item.id_profissional === idProfissional
          ? { ...item, [field]: value }
          : item
      )
    );
  }

  function limparRegraComissao(idProfissional: string) {
    setVinculos((prev) =>
      prev.map((item) =>
        item.id_profissional === idProfissional
          ? {
              ...item,
              comissao_percentual: "",
              comissao_assistente_percentual: "",
              base_calculo: "",
              desconta_taxa_maquininha: null,
            }
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
    setConsumos((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateConsumo(
    index: number,
    field: keyof ProdutoConsumoServico,
    value: ProdutoConsumoServico[keyof ProdutoConsumoServico]
  ) {
    setConsumos((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  async function resolverCategoriaParaSalvar() {
    const categoriaSelecionada = servico.id_categoria;

    if (categoriaSelecionada === "__nova__") {
      const nome = novaCategoria.trim();
      if (!nome) {
        throw new Error("Informe o nome da nova categoria.");
      }

      const existente = categorias.find(
        (item) => item.nome.trim().toLowerCase() === nome.toLowerCase()
      );

      return existente || null;
    }

    const categoria = categorias.find((item) => item.id === categoriaSelecionada);
    return categoria || null;
  }

  async function salvar() {
    try {
      setSaving(true);
      setErro("");
      setMsg("");

      if (!servico.nome.trim()) {
        throw new Error("Informe o nome do servico.");
      }

      const categoriaSalvar = await resolverCategoriaParaSalvar();

      const payload: ServicoProcessarPayload = {
        id_salao: idSalao,
        nome: servico.nome.trim(),
        id_categoria:
          servico.id_categoria === "__nova__"
            ? categoriaSalvar?.id || null
            : servico.id_categoria || null,
        categoria:
          servico.id_categoria === "__nova__"
            ? categoriaSalvar?.nome || novaCategoria.trim() || null
            : categoriaSalvar?.nome || null,
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

      const vinculosParaSalvar = vinculos
        .filter((item) => item.ativo)
        .map((item) => ({
          id_salao: idSalao,
          id_profissional: item.id_profissional,
          id_servico: servico.id || null,
          ativo: true,
          duracao_minutos: item.duracao_minutos
            ? Number(item.duracao_minutos)
            : null,
          preco_personalizado: item.preco_personalizado
            ? parseMoneyToNumber(item.preco_personalizado)
            : null,
          comissao_percentual: item.comissao_percentual
            ? Number(item.comissao_percentual)
            : null,
          comissao_assistente_percentual: item.comissao_assistente_percentual
            ? Number(item.comissao_assistente_percentual)
            : null,
          base_calculo: item.base_calculo || null,
          desconta_taxa_maquininha:
            typeof item.desconta_taxa_maquininha === "boolean"
              ? item.desconta_taxa_maquininha
              : null,
        }));

      const consumosValidos = consumos
        .filter(
          (item) => item.id_produto && Number(item.quantidade_consumo || 0) > 0
        )
        .map((item) => ({
          id_salao: idSalao,
          id_servico: servico.id || null,
          id_produto: item.id_produto,
          quantidade_consumo: Number(item.quantidade_consumo || 0),
          unidade_medida: item.unidade_medida || null,
          custo_estimado: item.custo_estimado
            ? parseMoneyToNumber(item.custo_estimado)
            : null,
          ativo: true,
        }));

      const requestBody: ServicoProcessarBody = {
        idSalao,
        acao: "salvar",
        servico: {
          id: servico.id || null,
          ...payload,
        },
        novaCategoria:
          servico.id_categoria === "__nova__" ? novaCategoria.trim() : null,
        vinculos: vinculosParaSalvar,
        consumos: consumosValidos,
      };

      const response = await fetch("/api/servicos/processar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = (await response.json().catch(() => ({}))) as Partial<
        ServicoProcessarResponse
      > &
        ServicoProcessarErrorResponse;

      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar servico.");
      }

      if (result.categoria?.id) {
        const categoriaAtualizada: CategoriaServico = result.categoria;
        setCategorias((prev) =>
          [
            ...prev.filter((item) => item.id !== categoriaAtualizada.id),
            categoriaAtualizada,
          ].sort((a, b) => a.nome.localeCompare(b.nome))
        );
        setServico((prev) => ({
          ...prev,
          id_categoria: categoriaAtualizada.id,
          categoria: categoriaAtualizada.nome,
        }));
        setNovaCategoria("");
      }

      if (modo === "novo") {
        router.push("/servicos");
        return;
      }

      setMsg("Servico atualizado com sucesso.");
    } catch (e: unknown) {
      console.error("Erro ao salvar servico:", e);
      setErro(e instanceof Error ? e.message : "Erro ao salvar servico.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          Carregando cadastro de servico...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">
            {modo === "novo" ? "Novo Servico" : "Editar Servico"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Cadastro completo de servico com agenda, preco, comissao e consumo.
          </p>
          <p className="mt-2 text-xs font-medium text-zinc-500">
            Comece pelos dados basicos e abra as demais secoes conforme precisar.
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
                ? "Salvar servico"
                : "Atualizar servico"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <ServicoFormGeralSection
              servico={servico}
              categorias={categorias}
              novaCategoria={novaCategoria}
              recursos={recursos}
              setField={setField}
              setNovaCategoria={setNovaCategoria}
            />

            <ServicoFormAgendaSection servico={servico} setField={setField} />

            <ServicoFormPrecoSection servico={servico} setField={setField} />

            <ServicoFormComissaoSection
              servico={servico}
              setField={setField}
              formatPercentPreview={formatPercentPreview}
              formatBaseCalculoLabel={formatBaseCalculoLabel}
            />

            <ServicoFormProfissionaisSection
              profissionais={profissionais}
              vinculos={vinculos}
              vinculosAtivos={vinculosAtivos}
              totalRegrasPersonalizadas={totalRegrasPersonalizadas}
              updateVinculo={updateVinculo}
              limparRegraComissao={limparRegraComissao}
              hasRegraComissaoPersonalizada={hasRegraComissaoPersonalizada}
              getTaxaMaquininhaSelectValue={getTaxaMaquininhaSelectValue}
              parseTaxaMaquininhaSelectValue={parseTaxaMaquininhaSelectValue}
              formatPercentPreview={formatPercentPreview}
              formatBaseCalculoLabel={formatBaseCalculoLabel}
              formatTaxaMaquininhaLabel={formatTaxaMaquininhaLabel}
            />

            <ServicoFormConsumoSection
              consumos={consumos}
              produtos={produtos}
              adicionarConsumo={adicionarConsumo}
              removerConsumo={removerConsumo}
              updateConsumo={updateConsumo}
            />
          </div>

          <ServicoFormResumoStatus
            precoPadraoNumero={precoPadraoNumero}
            custoProdutoNumero={custoProdutoNumero}
            servicoAtivo={servico.ativo}
            onChangeStatus={(ativo) => {
              setField("ativo", ativo);
              setField("status", ativo ? "ativo" : "inativo");
            }}
          />
        </div>
      </div>
    </div>
  );
}
