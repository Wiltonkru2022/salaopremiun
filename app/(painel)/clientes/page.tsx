"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";

type Cliente = {
  id: string;
  nome: string;
  whatsapp?: string | null;
  telefone?: string | null;
  email?: string | null;
  bairro?: string | null;
  profissao?: string | null;
  status?: string | null;
  ativo?: boolean | null;
  created_at?: string | null;
};

type Permissoes = Record<string, boolean>;

export default function ClientesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ativo" | "inativo">("todos");
  const [idSalao, setIdSalao] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);

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

    const permissoesFinal: Permissoes = {
      ...buildPermissoesByNivel(usuario.nivel),
      ...sanitizePermissoesDb(permissoesDb as Record<string, unknown> | null),
    };

    setPermissoes(permissoesFinal);
    setNivel(String(usuario.nivel || "").toLowerCase());
    setIdSalao(usuario.id_salao);
    setAcessoCarregado(true);

    if (!permissoesFinal.clientes_ver) {
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
      setMsg("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      const { idSalao } = (await getUsuarioLogado()) || { idSalao: acesso.idSalao };
      setIdSalao(idSalao);

      const { data, error } = await supabase
        .from("clientes")
        .select(
          "id, nome, whatsapp, telefone, email, bairro, profissao, status, ativo, created_at"
        )
        .eq("id_salao", idSalao)
        .order("nome", { ascending: true });

      if (error) throw error;

      setClientes((data as Cliente[]) || []);
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, supabase]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function alternarStatus(cliente: Cliente) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para alterar status de clientes.");
      return;
    }

    try {
      setSavingId(cliente.id);
      setErro("");
      setMsg("");

      const ativoAtual = cliente.ativo ?? (cliente.status === "ativo");
      const novoAtivo = !ativoAtual;
      const novoStatus = novoAtivo ? "ativo" : "inativo";

      const { error } = await supabase
        .from("clientes")
        .update({
          ativo: novoAtivo,
          status: novoStatus,
        })
        .eq("id", cliente.id)
        .eq("id_salao", idSalao);

      if (error) throw error;

      setClientes((prev) =>
        prev.map((item) =>
          item.id === cliente.id
            ? { ...item, ativo: novoAtivo, status: novoStatus }
            : item
        )
      );

      setMsg(`Cliente ${novoAtivo ? "ativado" : "inativado"} com sucesso.`);
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao alterar status.");
    } finally {
      setSavingId(null);
    }
  }

  async function excluirCliente(id: string) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para excluir clientes.");
      return;
    }

    const confirmar = window.confirm("Deseja realmente excluir este cliente?");
    if (!confirmar) return;

    try {
      setSavingId(id);
      setErro("");
      setMsg("");

      await supabase.from("clientes_ficha_tecnica").delete().eq("id_cliente", id);
      await supabase.from("clientes_preferencias").delete().eq("id_cliente", id);
      await supabase.from("clientes_autorizacoes").delete().eq("id_cliente", id);
      await supabase.from("clientes_auth").delete().eq("id_cliente", id);
      await supabase.from("clientes_historico").delete().eq("id_cliente", id);

      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id)
        .eq("id_salao", idSalao);

      if (error) throw error;

      setClientes((prev) => prev.filter((item) => item.id !== id));
      setMsg("Cliente excluído com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao excluir cliente.");
    } finally {
      setSavingId(null);
    }
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return clientes.filter((item) => {
      const ativoAtual = item.ativo ?? (item.status === "ativo");

      const bateBusca =
        !termo ||
        item.nome?.toLowerCase().includes(termo) ||
        item.whatsapp?.toLowerCase().includes(termo) ||
        item.telefone?.toLowerCase().includes(termo) ||
        item.email?.toLowerCase().includes(termo) ||
        item.bairro?.toLowerCase().includes(termo) ||
        item.profissao?.toLowerCase().includes(termo);

      const bateStatus =
        statusFiltro === "todos" ||
        (statusFiltro === "ativo" && ativoAtual) ||
        (statusFiltro === "inativo" && !ativoAtual);

      return bateBusca && bateStatus;
    });
  }, [clientes, busca, statusFiltro]);

  if (loading || !acessoCarregado) {
    return <div className="p-6 text-sm text-zinc-600">Carregando clientes...</div>;
  }

  if (permissoes && !permissoes.clientes_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar Clientes.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Clientes</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Gerencie cadastro, preferências, ficha técnica e permissões.
              </p>
            </div>

            {podeGerenciar ? (
              <Link
                href="/clientes/novo"
                className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
              >
                + Novo cliente
              </Link>
            ) : null}
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

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Buscar por nome, whatsapp, e-mail, bairro ou profissão"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
            />

            <select
              value={statusFiltro}
              onChange={(e) =>
                setStatusFiltro(e.target.value as "todos" | "ativo" | "inativo")
              }
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Apenas ativos</option>
              <option value="inativo">Apenas inativos</option>
            </select>

            <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Total: <strong className="ml-2 text-zinc-900">{listaFiltrada.length}</strong>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          {listaFiltrada.length === 0 ? (
            <div className="p-6 text-sm text-zinc-600">Nenhum cliente encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Contato
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Bairro
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Profissão
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200 bg-white">
                  {listaFiltrada.map((item) => {
                    const ativoAtual = item.ativo ?? (item.status === "ativo");

                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-zinc-900">{item.nome}</p>
                            <p className="text-sm text-zinc-500">
                              {item.email || "Sem e-mail"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          <div>{item.whatsapp || item.telefone || "-"}</div>
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {item.bairro || "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {item.profissao || "-"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              ativoAtual
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {ativoAtual ? "Ativo" : "Inativo"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            {podeGerenciar ? (
                              <>
                                <Link
                                  href={`/clientes/${item.id}`}
                                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                                >
                                  Editar
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => alternarStatus(item)}
                                  disabled={savingId === item.id}
                                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                                >
                                  {ativoAtual ? "Inativar" : "Ativar"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => excluirCliente(item.id)}
                                  disabled={savingId === item.id}
                                  className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                                >
                                  Excluir
                                </button>
                              </>
                            ) : (
                              <span className="text-xs font-medium text-zinc-400">
                                Somente leitura
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
