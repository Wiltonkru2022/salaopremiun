"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import AppLoading from "@/components/ui/AppLoading";
import { createClient } from "@/lib/supabase/client";

type ComandaRow = {
  id: string;
  numero: number;
  status: string;
  subtotal: number | null;
  desconto: number | null;
  acrescimo: number | null;
  total: number | null;
  aberta_em: string;
  id_cliente: string | null;
};

type ClienteRow = {
  id: string;
  nome: string;
};

type Comanda = {
  id: string;
  numero: number;
  status: string;
  subtotal: number;
  desconto: number;
  acrescimo: number;
  total: number;
  aberta_em: string;
  id_cliente: string | null;
  cliente_nome: string | null;
};

type Permissoes = Record<string, boolean>;

function formatCurrency(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getStatusMeta(status: string) {
  if (status === "fechada") {
    return {
      label: "Fechada",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "cancelada") {
    return {
      label: "Cancelada",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (status === "aguardando_pagamento") {
    return {
      label: "Aguardando pagamento",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (status === "em_atendimento") {
    return {
      label: "Em atendimento",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  return {
    label: "Aberta",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
  };
}

export default function ComandasPage() {
  const supabase = createClient();
  const router = useRouter();
  const { snapshot: painelSession } = usePainelSession();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [comandas, setComandas] = useState<Comanda[]>([]);

  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [nivel, setNivel] = useState("");
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const podeGerenciar = nivel === "admin" || nivel === "gerente";

  const carregarAcesso = useCallback(async () => {
    if (!painelSession?.idSalao || !painelSession?.permissoes) {
      router.replace("/login");
      return null;
    }
    const permissoesFinal = painelSession.permissoes as Permissoes;
    const nivelAtual = String(painelSession.nivel || "").toLowerCase();

    setPermissoes(permissoesFinal);
    setNivel(nivelAtual);
    setAcessoCarregado(true);

    if (!permissoesFinal.comandas_ver) {
      router.replace("/dashboard");
      return null;
    }

    return {
      idSalao: painelSession.idSalao,
      nivel: nivelAtual,
      permissoes: permissoesFinal,
    };
  }, [painelSession, router]);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      const { data: comandasData, error: comandasError } = await supabase
        .from("comandas")
        .select(`
          id,
          numero,
          status,
          subtotal,
          desconto,
          acrescimo,
          total,
          aberta_em,
          id_cliente
        `)
        .eq("id_salao", acesso.idSalao)
        .order("aberta_em", { ascending: false });

      if (comandasError) throw comandasError;

      const comandasRows = (comandasData as ComandaRow[]) || [];
      const idsClientes = Array.from(
        new Set(
          comandasRows
            .map((item) => item.id_cliente)
            .filter((id): id is string => Boolean(id))
        )
      );

      let clientesMap = new Map<string, string>();

      if (idsClientes.length > 0) {
        const { data: clientesData, error: clientesError } = await supabase
          .from("clientes")
          .select("id, nome")
          .in("id", idsClientes);

        if (clientesError) throw clientesError;

        const clientesRows = (clientesData as ClienteRow[]) || [];
        clientesMap = new Map(clientesRows.map((cliente) => [cliente.id, cliente.nome]));
      }

      setComandas(
        comandasRows.map((item) => ({
          id: item.id,
          numero: Number(item.numero || 0),
          status: item.status || "",
          subtotal: Number(item.subtotal || 0),
          desconto: Number(item.desconto || 0),
          acrescimo: Number(item.acrescimo || 0),
          total: Number(item.total || 0),
          aberta_em: item.aberta_em,
          id_cliente: item.id_cliente,
          cliente_nome: item.id_cliente ? clientesMap.get(item.id_cliente) || null : null,
        }))
      );
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao carregar comandas.");
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, supabase]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return comandas.filter((item) => {
      const nomeCliente = (item.cliente_nome || "").toLowerCase();
      const bateBusca =
        !termo ||
        String(item.numero).includes(termo) ||
        nomeCliente.includes(termo);
      const bateStatus = statusFiltro === "todos" || item.status === statusFiltro;

      return bateBusca && bateStatus;
    });
  }, [comandas, busca, statusFiltro]);

  const resumoComandas = useMemo(() => {
    return comandas.reduce(
      (acc, item) => {
        if (["aberta", "em_atendimento", "aguardando_pagamento"].includes(item.status)) {
          acc.ativas += 1;
          acc.totalAberto += Number(item.total || 0);
        }
        if (item.status === "aguardando_pagamento") acc.aguardando += 1;
        if (item.status === "fechada") acc.fechadas += 1;
        return acc;
      },
      { totalAberto: 0, ativas: 0, aguardando: 0, fechadas: 0 }
    );
  }, [comandas]);

  if (loading || !acessoCarregado) {
    return (
      <AppLoading
        title="Carregando comandas"
        message="Aguarde enquanto reunimos consumo, status, clientes e totais para conferencia."
        fullHeight={false}
      />
    );
  }

  if (permissoes && !permissoes.comandas_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Voce nao tem permissao para acessar Comandas.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 text-zinc-950 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Consumo e fechamento
              </div>
              <h1 className="mt-1 text-[1.9rem] font-bold tracking-[-0.04em] md:text-[2.1rem]">
                Comandas
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Consumo, status e total da venda em uma leitura mais direta para
                recepcao e caixa.
              </p>
            </div>

            {podeGerenciar ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/comandas/nova"
                  className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
                >
                  + Nova comanda
                </Link>
                <Link
                  href="/caixa"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
                >
                  Ir para o caixa
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard label="Comandas ativas" value={String(resumoComandas.ativas)} />
          <ResumoCard
            label="Aguardando pagamento"
            value={String(resumoComandas.aguardando)}
          />
          <ResumoCard
            label="Total em aberto"
            value={formatCurrency(resumoComandas.totalAberto)}
          />
          <ResumoCard
            label="Fechadas no historico"
            value={String(resumoComandas.fechadas)}
          />
        </div>

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.5fr)_220px_160px]">
            <input
              type="text"
              placeholder="Buscar por numero da comanda ou cliente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
            />

            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
            >
              <option value="todos">Todos</option>
              <option value="aberta">Aberta</option>
              <option value="em_atendimento">Em atendimento</option>
              <option value="aguardando_pagamento">Aguardando pagamento</option>
              <option value="fechada">Fechada</option>
              <option value="cancelada">Cancelada</option>
            </select>

            <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600">
              Total:
              <strong className="ml-2 text-zinc-900">{listaFiltrada.length}</strong>
            </div>
          </div>
        </section>

        <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
          {listaFiltrada.length === 0 ? (
            <div className="p-6 text-sm text-zinc-600">
              Nenhuma comanda encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-600">
                      Numero
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-600">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-600">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-600">
                      Abertura
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-zinc-600">
                      Acoes
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200 bg-white">
                  {listaFiltrada.map((item) => (
                    <tr key={item.id} className="transition hover:bg-zinc-50">
                      <td className="px-4 py-3.5 font-semibold text-zinc-900">
                        #{item.numero}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-700">
                        {item.cliente_nome || "Sem cliente"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-700">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusMeta(item.status).className}`}
                        >
                          {getStatusMeta(item.status).label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-700">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-700">
                        {new Date(item.aberta_em).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {podeGerenciar ? (
                          <Link
                            href={`/comandas/${item.id}`}
                            className="inline-flex items-center rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                          >
                            Abrir
                          </Link>
                        ) : (
                          <span className="text-xs font-medium text-zinc-400">
                            Somente leitura
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-[1.9rem] font-bold tracking-[-0.05em] text-zinc-950">
        {value}
      </div>
    </div>
  );
}
