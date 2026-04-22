"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  ProdutoPayload,
  ProdutoProcessarBody,
  ProdutoProcessarErrorResponse,
  ProdutoProcessarResponse,
} from "@/types/produtos";

import {
  calculateCostPerDose,
  calculateMargin,
  maskMoneyInput,
  maskPhone,
  parseMoneyToNumber,
} from "@/lib/utils/produtoMasks";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";

type ProdutoFormProps = {
  modo: "novo" | "editar";
};

type ProdutoState = {
  id?: string;
  id_salao: string;
  nome: string;
  sku: string;
  codigo_barras: string;
  marca: string;
  linha: string;
  unidade_medida: string;
  quantidade_por_embalagem: string;
  preco_custo: string;
  custos_extras: string;
  dose_padrao: string;
  unidade_dose: string;
  preco_venda: string;
  estoque_atual: string;
  estoque_minimo: string;
  estoque_maximo: string;
  data_validade: string;
  lote: string;
  destinacao: string;
  categoria: string;
  comissao_revenda_percentual: string;
  fornecedor_nome: string;
  fornecedor_contato_nome: string;
  fornecedor_telefone: string;
  fornecedor_whatsapp: string;
  prazo_medio_entrega_dias: string;
  observacoes: string;
  foto_url: string;
  status: string;
  ativo: boolean;
};

const initialState: ProdutoState = {
  id_salao: "",
  nome: "",
  sku: "",
  codigo_barras: "",
  marca: "",
  linha: "",
  unidade_medida: "un",
  quantidade_por_embalagem: "",
  preco_custo: "",
  custos_extras: "",
  dose_padrao: "",
  unidade_dose: "un",
  preco_venda: "",
  estoque_atual: "",
  estoque_minimo: "",
  estoque_maximo: "",
  data_validade: "",
  lote: "",
  destinacao: "uso_interno",
  categoria: "",
  comissao_revenda_percentual: "",
  fornecedor_nome: "",
  fornecedor_contato_nome: "",
  fornecedor_telefone: "",
  fornecedor_whatsapp: "",
  prazo_medio_entrega_dias: "",
  observacoes: "",
  foto_url: "",
  status: "ativo",
  ativo: true,
};

export default function ProdutoForm({ modo }: ProdutoFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const produtoId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [produto, setProduto] = useState<ProdutoState>(initialState);

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, produtoId]);

  const precoCusto = parseMoneyToNumber(produto.preco_custo);
  const custosExtras = parseMoneyToNumber(produto.custos_extras);
  const custoReal = useMemo(() => precoCusto + custosExtras, [precoCusto, custosExtras]);
  const precoVenda = parseMoneyToNumber(produto.preco_venda);
  const margem = useMemo(() => calculateMargin(precoVenda, custoReal), [precoVenda, custoReal]);

  const custoDose = useMemo(() => {
    const quantidadeEmbalagem = Number(produto.quantidade_por_embalagem || 0);
    const dosePadrao = Number(produto.dose_padrao || 0);
    return calculateCostPerDose(custoReal, quantidadeEmbalagem, dosePadrao);
  }, [custoReal, produto.quantidade_por_embalagem, produto.dose_padrao]);

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
    setProduto((prev) => ({ ...prev, id_salao: usuarioLogado.idSalao }));

    if (modo === "editar" && produtoId) {
      await carregarProduto(produtoId, usuarioLogado.idSalao);
    }
  } catch (e: unknown) {
    console.error(e);
    setErro(getErrorMessage(e, "Erro ao carregar formulário."));
  } finally {
    setLoading(false);
  }
}

  async function carregarProduto(id: string, salaoId: string) {
    const { data, error } = await supabase
      .from("produtos")
      .select("ativo, categoria, codigo_barras, comissao_revenda_percentual, created_at, custo_por_dose, custo_real, custos_extras, data_validade, destinacao, dose_padrao, estoque_atual, estoque_maximo, estoque_minimo, fornecedor_contato_nome, fornecedor_nome, fornecedor_telefone, fornecedor_whatsapp, foto_url, id, id_salao, linha, lote, marca, margem_lucro_percentual, nome, observacoes, prazo_medio_entrega_dias, preco_custo, preco_venda, quantidade_por_embalagem, sku, status, unidade_dose, unidade_medida, updated_at")
      .eq("id", id)
      .eq("id_salao", salaoId)
      .limit(1);

    if (error) throw error;

    const row = data?.[0];
    if (!row) throw new Error("Produto não encontrado.");

    setProduto({
      id: row.id,
      id_salao: row.id_salao,
      nome: row.nome || "",
      sku: row.sku || "",
      codigo_barras: row.codigo_barras || "",
      marca: row.marca || "",
      linha: row.linha || "",
      unidade_medida: row.unidade_medida || "un",
      quantidade_por_embalagem: row.quantidade_por_embalagem?.toString() || "",
      preco_custo: row.preco_custo?.toFixed(2).replace(".", ",") || "",
      custos_extras: row.custos_extras?.toFixed(2).replace(".", ",") || "",
      dose_padrao: row.dose_padrao?.toString() || "",
      unidade_dose: row.unidade_dose || "un",
      preco_venda: row.preco_venda?.toFixed(2).replace(".", ",") || "",
      estoque_atual: row.estoque_atual?.toString() || "",
      estoque_minimo: row.estoque_minimo?.toString() || "",
      estoque_maximo: row.estoque_maximo?.toString() || "",
      data_validade: row.data_validade || "",
      lote: row.lote || "",
      destinacao: row.destinacao || "uso_interno",
      categoria: row.categoria || "",
      comissao_revenda_percentual: row.comissao_revenda_percentual?.toString() || "",
      fornecedor_nome: row.fornecedor_nome || "",
      fornecedor_contato_nome: row.fornecedor_contato_nome || "",
      fornecedor_telefone: row.fornecedor_telefone || "",
      fornecedor_whatsapp: row.fornecedor_whatsapp || "",
      prazo_medio_entrega_dias: row.prazo_medio_entrega_dias?.toString() || "",
      observacoes: row.observacoes || "",
      foto_url: row.foto_url || "",
      status: row.status || "ativo",
      ativo: row.ativo ?? true,
    });
  }

  function setField<K extends keyof ProdutoState>(field: K, value: ProdutoState[K]) {
    setProduto((prev) => ({ ...prev, [field]: value }));
  }

  async function salvar() {
    try {
      setSaving(true);
      setErro("");
      setMsg("");

      if (!produto.nome.trim()) {
        throw new Error("Informe o nome do produto.");
      }

      const payload: ProdutoPayload = {
        id_salao: idSalao,
        nome: produto.nome.trim(),
        sku: produto.sku.trim() || null,
        codigo_barras: produto.codigo_barras.trim() || null,
        marca: produto.marca.trim() || null,
        linha: produto.linha.trim() || null,
        unidade_medida: produto.unidade_medida || "un",
        quantidade_por_embalagem: Number(produto.quantidade_por_embalagem || 0),
        preco_custo: parseMoneyToNumber(produto.preco_custo),
        custos_extras: parseMoneyToNumber(produto.custos_extras),
        custo_por_dose: custoDose || 0,
        dose_padrao: Number(produto.dose_padrao || 0),
        unidade_dose: produto.unidade_dose || null,
        preco_venda: parseMoneyToNumber(produto.preco_venda),
        margem_lucro_percentual: margem || 0,
        estoque_atual: Number(produto.estoque_atual || 0),
        estoque_minimo: Number(produto.estoque_minimo || 0),
        estoque_maximo: produto.estoque_maximo ? Number(produto.estoque_maximo) : null,
        data_validade: produto.data_validade || null,
        lote: produto.lote.trim() || null,
        destinacao: produto.destinacao || "uso_interno",
        categoria: produto.categoria.trim() || null,
        comissao_revenda_percentual: Number(produto.comissao_revenda_percentual || 0),
        fornecedor_nome: produto.fornecedor_nome.trim() || null,
        fornecedor_contato_nome: produto.fornecedor_contato_nome.trim() || null,
        fornecedor_telefone: produto.fornecedor_telefone.trim() || null,
        fornecedor_whatsapp: produto.fornecedor_whatsapp.trim() || null,
        prazo_medio_entrega_dias: produto.prazo_medio_entrega_dias
          ? Number(produto.prazo_medio_entrega_dias)
          : null,
        observacoes: produto.observacoes.trim() || null,
        foto_url: produto.foto_url.trim() || null,
        status: produto.ativo ? "ativo" : "inativo",
        ativo: produto.ativo,
      };

        const requestBody: ProdutoProcessarBody = {
          idSalao,
          acao: "salvar",
          produto: {
            id: produto.id || null,
            ...payload,
          },
        };

        const response = await fetch("/api/produtos/processar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const result = (await response.json().catch(() => ({}))) as Partial<
          ProdutoProcessarResponse
        > &
          ProdutoProcessarErrorResponse;

      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar produto.");
      }

      if (modo === "novo") {
        router.push("/produtos");
        return;
      }

      setMsg("Produto atualizado com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          Carregando cadastro de produto...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">
            {modo === "novo" ? "Novo Produto" : "Editar Produto"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Cadastro completo com estoque, custo real, revenda e fornecedor.
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
            onClick={() => router.push("/produtos")}
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
            {saving ? "Salvando..." : modo === "novo" ? "Salvar produto" : "Atualizar produto"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card title="1. Dados básicos" subtitle="Identificação do produto">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Nome do produto" value={produto.nome} onChange={(v) => setField("nome", v)} required />
                <Input label="SKU" value={produto.sku} onChange={(v) => setField("sku", v)} />
                <Input label="Código de barras" value={produto.codigo_barras} onChange={(v) => setField("codigo_barras", v)} />
                <Input label="Marca" value={produto.marca} onChange={(v) => setField("marca", v)} />
                <Input label="Linha" value={produto.linha} onChange={(v) => setField("linha", v)} />

                <Select
                  label="Unidade de medida"
                  value={produto.unidade_medida}
                  onChange={(v) => setField("unidade_medida", v)}
                  options={[
                    { value: "un", label: "Unidade" },
                    { value: "ml", label: "Mililitro" },
                    { value: "l", label: "Litro" },
                    { value: "g", label: "Grama" },
                    { value: "kg", label: "Quilo" },
                  ]}
                />

                <Input
                  label="Quantidade por embalagem"
                  value={produto.quantidade_por_embalagem}
                  onChange={(v) => setField("quantidade_por_embalagem", v)}
                  placeholder="Ex: 1000"
                />

                <Input label="Lote" value={produto.lote} onChange={(v) => setField("lote", v)} />

                <Input
                  label="Data de validade"
                  type="date"
                  value={produto.data_validade}
                  onChange={(v) => setField("data_validade", v)}
                />

                <Input label="Categoria" value={produto.categoria} onChange={(v) => setField("categoria", v)} />

                <Select
                  label="Destinação"
                  value={produto.destinacao}
                  onChange={(v) => setField("destinacao", v)}
                  options={[
                    { value: "uso_interno", label: "Uso interno" },
                    { value: "revenda", label: "Revenda" },
                    { value: "ambos", label: "Ambos" },
                  ]}
                />
              </div>
            </Card>

            <Card title="2. Precificação e custos" subtitle="Onde o lucro mora">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Preço de custo"
                  value={produto.preco_custo}
                  onChange={(v) => setField("preco_custo", maskMoneyInput(v))}
                  placeholder="0,00"
                />

                <Input
                  label="Custos extras"
                  value={produto.custos_extras}
                  onChange={(v) => setField("custos_extras", maskMoneyInput(v))}
                  placeholder="0,00"
                />

                <Input
                  label="Preço de venda"
                  value={produto.preco_venda}
                  onChange={(v) => setField("preco_venda", maskMoneyInput(v))}
                  placeholder="0,00"
                />

                <Input
                  label="Comissão revenda (%)"
                  value={produto.comissao_revenda_percentual}
                  onChange={(v) => setField("comissao_revenda_percentual", v)}
                  placeholder="0"
                />

                <Input
                  label="Dose padrão"
                  value={produto.dose_padrao}
                  onChange={(v) => setField("dose_padrao", v)}
                  placeholder="Ex: 30"
                />

                <Select
                  label="Unidade da dose"
                  value={produto.unidade_dose}
                  onChange={(v) => setField("unidade_dose", v)}
                  options={[
                    { value: "un", label: "Unidade" },
                    { value: "ml", label: "Mililitro" },
                    { value: "g", label: "Grama" },
                  ]}
                />
              </div>
            </Card>

            <Card title="3. Controle de estoque" subtitle="Para não faltar nem sobrar">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label="Estoque atual"
                  value={produto.estoque_atual}
                  onChange={(v) => setField("estoque_atual", v)}
                />

                <Input
                  label="Estoque mínimo"
                  value={produto.estoque_minimo}
                  onChange={(v) => setField("estoque_minimo", v)}
                />

                <Input
                  label="Estoque máximo"
                  value={produto.estoque_maximo}
                  onChange={(v) => setField("estoque_maximo", v)}
                />
              </div>
            </Card>

            <Card title="4. Fornecedor" subtitle="Para facilitar recompra">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Fornecedor / distribuidor"
                  value={produto.fornecedor_nome}
                  onChange={(v) => setField("fornecedor_nome", v)}
                />

                <Input
                  label="Contato do representante"
                  value={produto.fornecedor_contato_nome}
                  onChange={(v) => setField("fornecedor_contato_nome", v)}
                />

                <Input
                  label="Telefone"
                  value={produto.fornecedor_telefone}
                  onChange={(v) => setField("fornecedor_telefone", maskPhone(v))}
                  placeholder="(00) 00000-0000"
                />

                <Input
                  label="WhatsApp"
                  value={produto.fornecedor_whatsapp}
                  onChange={(v) => setField("fornecedor_whatsapp", maskPhone(v))}
                  placeholder="(00) 00000-0000"
                />

                <Input
                  label="Prazo médio de entrega (dias)"
                  value={produto.prazo_medio_entrega_dias}
                  onChange={(v) => setField("prazo_medio_entrega_dias", v)}
                />

                <Input
                  label="URL da foto"
                  value={produto.foto_url}
                  onChange={(v) => setField("foto_url", v)}
                />

                <div className="md:col-span-2">
                  <Textarea
                    label="Observações"
                    value={produto.observacoes}
                    onChange={(v) => setField("observacoes", v)}
                  />
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Resumo financeiro" subtitle="Cálculo automático">
              <div className="space-y-4">
                <Info label="Custo real" value={`R$ ${custoReal.toFixed(2)}`} />
                <Info label="Margem de lucro" value={`${margem.toFixed(2)}%`} />
                <Info label="Custo por dose" value={`R$ ${custoDose.toFixed(4)}`} />
              </div>
            </Card>

            <Card title="Status" subtitle="Controle do cadastro">
              <div className="space-y-4">
                <Select
                  label="Status"
                  value={produto.ativo ? "ativo" : "inativo"}
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
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
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
        placeholder={placeholder}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-zinc-900">{value}</p>
    </div>
  );
}
