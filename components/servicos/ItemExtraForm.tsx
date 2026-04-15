"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { maskMoneyInput, parseMoneyToNumber } from "@/lib/utils/serviceMasks";

type ItemExtraFormProps = {
  modo: "novo" | "editar";
};

type ItemExtraState = {
  id?: string;
  id_salao: string;
  nome: string;
  categoria: string;
  descricao: string;
  preco_venda: string;
  custo: string;
  controla_estoque: boolean;
  estoque_atual: string;
};

const initialState: ItemExtraState = {
  id_salao: "",
  nome: "",
  categoria: "",
  descricao: "",
  preco_venda: "",
  custo: "",
  controla_estoque: false,
  estoque_atual: "",
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

export default function ItemExtraForm({ modo }: ItemExtraFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const itemId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [item, setItem] = useState<ItemExtraState>(initialState);

  const precoVendaNumero = useMemo(
    () => parseMoneyToNumber(item.preco_venda),
    [item.preco_venda]
  );

  const custoNumero = useMemo(
    () => parseMoneyToNumber(item.custo),
    [item.custo]
  );

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, itemId]);

  async function bootstrap() {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const usuario = await getUsuarioLogado();

      if (!usuario) {
        throw new Error("Usuário não autenticado.");
      }

      if (!usuario.idSalao) {
        throw new Error("Não foi possível identificar o salão do usuário.");
      }

      setIdSalao(usuario.idSalao);
      setItem((prev) => ({ ...prev, id_salao: usuario.idSalao }));

      if (modo === "editar" && itemId) {
        await carregarItem(itemId, usuario.idSalao);
      }
    } catch (e: any) {
      console.error("Erro no bootstrap do item extra:", e);
      setErro(e.message || "Erro ao carregar formulário.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarItem(id: string, salaoId: string) {
    const { data, error } = await supabase
      .from("itens_extras")
      .select("*")
      .eq("id", id)
      .eq("id_salao", salaoId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Serviço extra não encontrado.");

    setItem({
      id: data.id,
      id_salao: data.id_salao,
      nome: data.nome || "",
      categoria: data.categoria || "",
      descricao: data.descricao || "",
      preco_venda: formatMoneyFromDb(data.preco_venda),
      custo: formatMoneyFromDb(data.custo),
      controla_estoque: data.controla_estoque ?? false,
      estoque_atual: data.estoque_atual?.toString() || "",
    });
  }

  function setField<K extends keyof ItemExtraState>(
    field: K,
    value: ItemExtraState[K]
  ) {
    setItem((prev) => ({ ...prev, [field]: value }));
  }

  async function salvar() {
    try {
      setSaving(true);
      setErro("");
      setMsg("");

      if (!item.nome.trim()) {
        throw new Error("Informe o nome do serviço extra.");
      }

      if (!item.preco_venda.trim()) {
        throw new Error("Informe o preço de venda.");
      }

      const payload = {
        id_salao: idSalao,
        nome: item.nome.trim(),
        categoria: item.categoria.trim() || null,
        descricao: item.descricao.trim() || null,
        preco_venda: parseMoneyToNumber(item.preco_venda),
        custo: item.custo ? parseMoneyToNumber(item.custo) : 0,
        controla_estoque: item.controla_estoque,
        estoque_atual: item.controla_estoque
          ? Number(item.estoque_atual || 0)
          : 0,
      };

      if (modo === "novo") {
        const { error } = await supabase.from("itens_extras").insert(payload);

        if (error) throw error;

        router.push("/servicos-extras");
        return;
      }

      const { error } = await supabase
        .from("itens_extras")
        .update(payload)
        .eq("id", item.id)
        .eq("id_salao", idSalao);

      if (error) throw error;

      setMsg("Serviço extra atualizado com sucesso.");
    } catch (e: any) {
      console.error("Erro ao salvar item extra:", e);
      setErro(e.message || "Erro ao salvar serviço extra.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          Carregando cadastro de serviço extra...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">
            {modo === "novo" ? "Novo Serviço Extra" : "Editar Serviço Extra"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Cadastre extras cobrados à parte, como adicionais e complementos.
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
            onClick={() => router.push("/servicos-extras")}
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
              ? "Salvar extra"
              : "Atualizar extra"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card title="1. Dados do extra" subtitle="Nome, categoria e descrição">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Nome"
                  value={item.nome}
                  onChange={(v) => setField("nome", v)}
                  required
                />

                <Input
                  label="Categoria"
                  value={item.categoria}
                  onChange={(v) => setField("categoria", v)}
                />

                <div className="md:col-span-2">
                  <Textarea
                    label="Descrição"
                    value={item.descricao}
                    onChange={(v) => setField("descricao", v)}
                  />
                </div>
              </div>
            </Card>

            <Card title="2. Preço e custo" subtitle="Valores do item extra">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Preço de venda"
                  value={item.preco_venda}
                  onChange={(v) => setField("preco_venda", maskMoneyInput(v))}
                  required
                />

                <Input
                  label="Custo"
                  value={item.custo}
                  onChange={(v) => setField("custo", maskMoneyInput(v))}
                />
              </div>
            </Card>

            <Card title="3. Estoque" subtitle="Controle opcional de estoque">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Switch
                  label="Controla estoque"
                  checked={item.controla_estoque}
                  onChange={(v) => setField("controla_estoque", v)}
                />

                <Input
                  label="Estoque atual"
                  value={item.estoque_atual}
                  onChange={(v) => setField("estoque_atual", v)}
                  type="number"
                />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Resumo" subtitle="Visão rápida">
              <div className="space-y-4">
                <Info
                  label="Preço de venda"
                  value={`R$ ${precoVendaNumero.toFixed(2)}`}
                />
                <Info label="Custo" value={`R$ ${custoNumero.toFixed(2)}`} />
                <Info
                  label="Lucro estimado"
                  value={`R$ ${(precoVendaNumero - custoNumero).toFixed(2)}`}
                />
                <Info
                  label="Estoque"
                  value={
                    item.controla_estoque
                      ? String(Number(item.estoque_atual || 0))
                      : "Não controlado"
                  }
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
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-zinc-900">{value}</p>
    </div>
  );
}
