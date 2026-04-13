"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";

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

export default function ComandasPage() {
  const supabase = createClient();
  const router = useRouter();

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return null;
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id, id_salao, nivel, status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (usuarioError || !usuario?.id || !usuario?.id_salao) {
      setErro("Não foi possível validar o usuário do sistema.");
      return null;
    }

    if (usuario.status && usuario.status !== "ativo") {
      setErro("Usuário inativo.");
      return null;
    }

    const { data: permissoesDb } = await supabase
      .from("usuarios_permissoes")
      .select("*")
      .eq("id_usuario", usuario.id)
      .eq("id_salao", usuario.id_salao)
      .maybeSingle();

    const permissoesFinal: Permissoes =
      permissoesDb || {
        dashboard_ver: true,
        agenda_ver: true,
        clientes_ver: true,
        profissionais_ver: true,
        servicos_ver: true,
        produtos_ver: true,
        estoque_ver: true,
        comandas_ver: true,
        vendas_ver: true,
        caixa_ver: true,
        comissoes_ver: true,
        relatorios_ver: true,
        marketing_ver: true,
        configuracoes_ver: usuario.nivel === "admin",
        assinatura_ver: usuario.nivel === "admin",
      };

    setPermissoes(permissoesFinal);
    setNivel(String(usuario.nivel || "").toLowerCase());
    setAcessoCarregado(true);

    if (!permissoesFinal.comandas_ver) {
      router.replace("/dashboard");
      return null;
    }

    return {
      idSalao: usuario.id_salao,
      nivel: String(usuario.nivel || "").toLowerCase(),
      permissoes: permissoesFinal,
    };
  }, [router, supabase]);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      const { idSalao } = (await getUsuarioLogado()) || { idSalao: acesso.idSalao };

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
        .eq("id_salao", idSalao)
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

      const listaFinal: Comanda[] = comandasRows.map((item) => ({
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
      }));

      setComandas(listaFinal);
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

      const bateStatus =
        statusFiltro === "todos" || item.status === statusFiltro;

      return bateBusca && bateStatus;
    });
  }, [comandas, busca, statusFiltro]);

  if (loading || !acessoCarregado) {
    return <div className="p-6 text-sm text-zinc-600">Carregando comandas...</div>;
  }

  if (permissoes && !permissoes.comandas_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar Comandas.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mt-2 text-2xl font-bold md:text-3xl">Comandas</h1>
              <p className="mt-2 text-sm text-zinc-300">
                Controle completo do consumo da cliente até o fechamento no caixa.
              </p>
            </div>

            {podeGerenciar ? (
              <Link
                href="/comandas/nova"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-zinc-900"
              >
                + Nova comanda
              </Link>
            ) : null}
          </div>
        </div>

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        ) : null}

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Buscar por número da comanda ou cliente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
            />

            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
            >
              <option value="todos">Todos</option>
              <option value="aberta">Aberta</option>
              <option value="em_atendimento">Em atendimento</option>
              <option value="aguardando_pagamento">Aguardando pagamento</option>
              <option value="fechada">Fechada</option>
              <option value="cancelada">Cancelada</option>
            </select>

            <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Total:
              <strong className="ml-2 text-zinc-900">{listaFiltrada.length}</strong>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          {listaFiltrada.length === 0 ? (
            <div className="p-6 text-sm text-zinc-600">
              Nenhuma comanda encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-600">
                      Número
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
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200 bg-white">
                  {listaFiltrada.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 font-semibold text-zinc-900">
                        #{item.numero}
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-700">
                        {item.cliente_nome || "Sem cliente"}
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-700">
                        {item.status}
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-700">
                        R$ {Number(item.total || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-700">
                        {new Date(item.aberta_em).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {podeGerenciar ? (
                          <Link
                            href={`/comandas/${item.id}`}
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700"
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