"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import {
  maskMoneyInput,
  parseMoneyToNumber,
} from "@/lib/utils/produtoMasks";

type Produto = {
  id: string;
  nome: string;
  unidade_medida?: string | null;
  estoque_atual?: number | null;
};

type EstoqueProcessarResponse = {
  ok: boolean;
  idMovimentacao?: string | null;
  estoqueAtual?: number | null;
};

type EstoqueProcessarErrorResponse = {
  error?: string;
};

export default function MovimentacaoForm() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [produtoId, setProdutoId] = useState("");
  const [tipo, setTipo] = useState("entrada");
  const [origem, setOrigem] = useState("manual");
  const [quantidade, setQuantidade] = useState("");
  const [valorUnitario, setValorUnitario] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, unidade_medida, estoque_atual")
        .eq("id_salao", usuarioLogado.idSalao)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) throw error;

      setProdutos((data as Produto[]) || []);
    } catch (error: unknown) {
      console.error(error);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar movimentacao."
      );
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    try {
      setSaving(true);
      setErro("");
      setMsg("");

      if (!produtoId) {
        throw new Error("Selecione o produto.");
      }

      if (!quantidade || Number(quantidade) <= 0) {
        throw new Error("Informe a quantidade.");
      }

      const produto = produtos.find((item) => item.id === produtoId);
      if (!produto) {
        throw new Error("Produto nao encontrado.");
      }

      const qtd = Number(quantidade);
      const valorUnit = parseMoneyToNumber(valorUnitario);
      const estoqueAtual = Number(produto.estoque_atual ?? 0);

      let novoEstoque = estoqueAtual;
      if (tipo === "entrada") novoEstoque = estoqueAtual + qtd;
      if (tipo === "saida" || tipo === "consumo_interno" || tipo === "venda") {
        novoEstoque = estoqueAtual - qtd;
      }
      if (tipo === "ajuste") {
        novoEstoque = qtd;
      }

      if (novoEstoque < 0) {
        throw new Error("O estoque nao pode ficar negativo.");
      }

      const response = await fetch("/api/estoque/processar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idSalao,
          acao: "movimentacao_manual",
          movimentacao: {
            idProduto: produtoId,
            tipo,
            origem,
            quantidade: qtd,
            valorUnitario: valorUnit || null,
            observacoes: observacoes.trim() || null,
          },
        }),
      });

      const result = (await response.json().catch(() => ({}))) as Partial<
        EstoqueProcessarResponse
      > &
        EstoqueProcessarErrorResponse;

      if (!response.ok) {
        throw new Error(result.error || "Erro ao registrar movimentacao.");
      }

      setProdutos((prev) =>
        prev.map((item) =>
          item.id === produtoId
            ? { ...item, estoque_atual: result.estoqueAtual ?? novoEstoque }
            : item
        )
      );

      setMsg("Movimentacao registrada com sucesso.");
      setProdutoId("");
      setTipo("entrada");
      setOrigem("manual");
      setQuantidade("");
      setValorUnitario("");
      setObservacoes("");
    } catch (error: unknown) {
      console.error(error);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao registrar movimentacao."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          Carregando movimentacao...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">
            Nova movimentacao
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Registre entrada, saida, ajuste, consumo interno ou venda.
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

        <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <Select
            label="Produto"
            value={produtoId}
            onChange={setProdutoId}
            options={[
              { value: "", label: "Selecione" },
              ...produtos.map((produto) => ({
                value: produto.id,
                label: `${produto.nome} (${Number(
                  produto.estoque_atual ?? 0
                ).toFixed(2)} ${produto.unidade_medida || ""})`,
              })),
            ]}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Tipo"
              value={tipo}
              onChange={setTipo}
              options={[
                { value: "entrada", label: "Entrada" },
                { value: "saida", label: "Saida" },
                { value: "ajuste", label: "Ajuste" },
                { value: "consumo_interno", label: "Consumo interno" },
                { value: "venda", label: "Venda" },
              ]}
            />

            <Select
              label="Origem"
              value={origem}
              onChange={setOrigem}
              options={[
                { value: "manual", label: "Manual" },
                { value: "compra", label: "Compra" },
                { value: "pdv", label: "PDV" },
                { value: "servico", label: "Servico" },
                { value: "perda", label: "Perda" },
                { value: "devolucao", label: "Devolucao" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Quantidade"
              value={quantidade}
              onChange={setQuantidade}
              placeholder="Ex: 10"
            />

            <Input
              label="Valor unitario"
              value={valorUnitario}
              onChange={(value) => setValorUnitario(maskMoneyInput(value))}
              placeholder="0,00"
            />
          </div>

          <Textarea
            label="Observacoes"
            value={observacoes}
            onChange={setObservacoes}
          />

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/estoque")}
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
            >
              Voltar
            </button>

            <button
              type="button"
              onClick={salvar}
              disabled={saving}
              className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar movimentacao"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-zinc-700">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
      <label className="mb-1 block text-sm font-semibold text-zinc-700">
        {label}
      </label>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
      <label className="mb-1 block text-sm font-semibold text-zinc-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
