"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { maskMoneyInput, parseMoneyToNumber } from "@/lib/utils/produtoMasks";

type Produto = {
  id: string;
  nome: string;
  unidade_medida?: string | null;
  estoque_atual?: number | null;
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
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const { data, error } = await supabase
      .from("produtos")
      .select("id, nome, unidade_medida, estoque_atual")
      .eq("id_salao", usuarioLogado.idSalao)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw error;

    setProdutos((data as Produto[]) || []);
  } catch (e: any) {
    console.error(e);
    setErro(e.message || "Erro ao carregar movimentação.");
  } finally {
    setLoading(false);
  }
}

  async function salvar() {
    try {
      setSaving(true);
      setErro("");
      setMsg("");

      if (!produtoId) throw new Error("Selecione o produto.");
      if (!quantidade || Number(quantidade) <= 0) throw new Error("Informe a quantidade.");

      const produto = produtos.find((p) => p.id === produtoId);
      if (!produto) throw new Error("Produto não encontrado.");

      const qtd = Number(quantidade);
      const valorUnit = parseMoneyToNumber(valorUnitario);
      const valorTotal = Number((qtd * valorUnit).toFixed(2));
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
        throw new Error("O estoque não pode ficar negativo.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: movError } = await supabase.from("produtos_movimentacoes").insert({
        id_salao: idSalao,
        id_produto: produtoId,
        tipo,
        origem,
        quantidade: qtd,
        valor_unitario: valorUnit || null,
        valor_total: valorTotal || null,
        observacoes: observacoes.trim() || null,
        id_usuario: user?.id || null,
      });

      if (movError) throw movError;

      const { error: updateError } = await supabase
        .from("produtos")
        .update({
          estoque_atual: novoEstoque,
        })
        .eq("id", produtoId)
        .eq("id_salao", idSalao);

      if (updateError) throw updateError;

      const minimo = 0;
      if (novoEstoque <= minimo) {
        await supabase.from("produtos_alertas").insert({
          id_salao: idSalao,
          id_produto: produtoId,
          tipo: "estoque_minimo",
          mensagem: `O produto "${produto.nome}" ficou com estoque baixo.`,
          resolvido: false,
        });
      }

      setMsg("Movimentação registrada com sucesso.");
      setProdutoId("");
      setTipo("entrada");
      setOrigem("manual");
      setQuantidade("");
      setValorUnitario("");
      setObservacoes("");
    } catch (e: any) {
      console.error(e);
      setErro(e.message || "Erro ao registrar movimentação.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          Carregando movimentação...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 text-white shadow-xl">
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">Nova movimentação</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Registre entrada, saída, ajuste, consumo interno ou venda.
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

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <Select
            label="Produto"
            value={produtoId}
            onChange={setProdutoId}
            options={[
              { value: "", label: "Selecione" },
              ...produtos.map((p) => ({
                value: p.id,
                label: `${p.nome} (${Number(p.estoque_atual ?? 0).toFixed(2)} ${p.unidade_medida || ""})`,
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
                { value: "saida", label: "Saída" },
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
                { value: "servico", label: "Serviço" },
                { value: "perda", label: "Perda" },
                { value: "devolucao", label: "Devolução" },
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
              label="Valor unitário"
              value={valorUnitario}
              onChange={(v) => setValorUnitario(maskMoneyInput(v))}
              placeholder="0,00"
            />
          </div>

          <Textarea
            label="Observações"
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
              {saving ? "Salvando..." : "Salvar movimentação"}
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
      <label className="mb-1 block text-sm font-semibold text-zinc-700">{label}</label>
      <input
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
