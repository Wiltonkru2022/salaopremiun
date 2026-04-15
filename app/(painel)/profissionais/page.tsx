"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";

type Profissional = {
  id: string;
  nome: string;
  nome_social?: string | null;
  categoria?: string | null;
  cargo?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  foto_url?: string | null;
  status?: string | null;
  ativo?: boolean | null;
  total_assistentes?: number;
  app_ativo?: boolean;
};

type Permissoes = Record<string, boolean>;

export default function ProfissionaisListPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ativo" | "inativo">("todos");
  const [idSalao, setIdSalao] = useState("");
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);

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
    setIdSalao(usuario.id_salao);
    setAcessoCarregado(true);

    if (!permissoesFinal.profissionais_ver) {
      router.replace("/dashboard");
      return null;
    }

    return {
      idSalao: usuario.id_salao,
      nivel: String(usuario.nivel || "").toLowerCase(),
      permissoes: permissoesFinal,
    };
  }, [router, supabase]);

  const carregarProfissionais = useCallback(
    async (salaoId: string) => {
      const { data, error } = await supabase
        .from("profissionais")
        .select(`
          id,
          nome,
          nome_social,
          categoria,
          cargo,
          telefone,
          whatsapp,
          email,
          foto_url,
          status,
          ativo
        `)
        .eq("id_salao", salaoId)
        .order("nome", { ascending: true });

      if (error) throw error;

      const listaBase = (data as Profissional[]) || [];

      if (listaBase.length === 0) {
        setProfissionais([]);
        return;
      }

      const idsProfissionais = listaBase.map((item) => item.id);

      const { data: assistentesRows, error: assistentesError } = await supabase
        .from("profissional_assistentes")
        .select("id_profissional")
        .eq("id_salao", salaoId)
        .in("id_profissional", idsProfissionais);

      if (assistentesError) throw assistentesError;

      const { data: acessosRows, error: acessosError } = await supabase
        .from("profissionais_acessos")
        .select("id_profissional, ativo")
        .in("id_profissional", idsProfissionais);

      if (acessosError) throw acessosError;

      const totalPorProfissional = new Map<string, number>();
      for (const row of assistentesRows || []) {
        const totalAtual = totalPorProfissional.get(row.id_profissional) || 0;
        totalPorProfissional.set(row.id_profissional, totalAtual + 1);
      }

      const acessoPorProfissional = new Map<string, boolean>();
      for (const row of acessosRows || []) {
        acessoPorProfissional.set(row.id_profissional, !!row.ativo);
      }

      const listaFinal = listaBase.map((item) => ({
        ...item,
        total_assistentes: totalPorProfissional.get(item.id) || 0,
        app_ativo: acessoPorProfissional.get(item.id) || false,
      }));

      setProfissionais(listaFinal);
    },
    [supabase]
  );

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      const usuarioLogado = await getUsuarioLogado();
      const salaoIdFinal = usuarioLogado?.idSalao || acesso.idSalao;

      setIdSalao(salaoIdFinal);
      await carregarProfissionais(salaoIdFinal);
    } catch (e: unknown) {
      console.error("ERRO PROFISSIONAIS:", e);
      setErro(e instanceof Error ? e.message : "Erro ao carregar profissionais.");
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, carregarProfissionais]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function alternarStatus(profissional: Profissional) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para alterar status de profissionais.");
      return;
    }

    try {
      setSavingId(profissional.id);
      setErro("");
      setMsg("");

      const novoAtivo = !(profissional.ativo ?? profissional.status === "ativo");
      const novoStatus = novoAtivo ? "ativo" : "inativo";

      const { error } = await supabase
        .from("profissionais")
        .update({
          ativo: novoAtivo,
          status: novoStatus,
        })
        .eq("id", profissional.id)
        .eq("id_salao", idSalao);

      if (error) throw error;

      setProfissionais((prev) =>
        prev.map((item) =>
          item.id === profissional.id
            ? { ...item, ativo: novoAtivo, status: novoStatus }
            : item
        )
      );

      setMsg(`Profissional ${novoAtivo ? "ativado" : "inativado"} com sucesso.`);
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao alterar status.");
    } finally {
      setSavingId(null);
    }
  }

  async function excluirProfissional(id: string) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para excluir profissionais.");
      return;
    }

    const confirmar = window.confirm(
      "Deseja realmente excluir este profissional? Essa ação pode afetar vínculos e históricos."
    );

    if (!confirmar) return;

    try {
      setSavingId(id);
      setErro("");
      setMsg("");

      const { error: acessoError } = await supabase
        .from("profissionais_acessos")
        .delete()
        .eq("id_profissional", id);

      if (acessoError) throw acessoError;

      const { error: vinculoServicoError } = await supabase
        .from("profissional_servicos")
        .delete()
        .eq("id_profissional", id);

      if (vinculoServicoError) throw vinculoServicoError;

      const { error: vinculoAssistentePrincipalError } = await supabase
        .from("profissional_assistentes")
        .delete()
        .eq("id_profissional", id);

      if (vinculoAssistentePrincipalError) throw vinculoAssistentePrincipalError;

      const { error: vinculoAssistenteSecundarioError } = await supabase
        .from("profissional_assistentes")
        .delete()
        .eq("id_assistente", id);

      if (vinculoAssistenteSecundarioError) throw vinculoAssistenteSecundarioError;

      const { error } = await supabase
        .from("profissionais")
        .delete()
        .eq("id", id)
        .eq("id_salao", idSalao);

      if (error) throw error;

      setProfissionais((prev) => prev.filter((item) => item.id !== id));
      setMsg("Profissional excluído com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao excluir profissional.");
    } finally {
      setSavingId(null);
    }
  }

  const listaFiltrada = useMemo(() => {
    return profissionais.filter((item) => {
      const nomeBusca = busca.toLowerCase().trim();

      const bateBusca =
        !nomeBusca ||
        item.nome?.toLowerCase().includes(nomeBusca) ||
        item.nome_social?.toLowerCase().includes(nomeBusca) ||
        item.categoria?.toLowerCase().includes(nomeBusca) ||
        item.cargo?.toLowerCase().includes(nomeBusca) ||
        item.email?.toLowerCase().includes(nomeBusca);

      const ativoAtual = item.ativo ?? item.status === "ativo";

      const bateStatus =
        statusFiltro === "todos" ||
        (statusFiltro === "ativo" && ativoAtual) ||
        (statusFiltro === "inativo" && !ativoAtual);

      return bateBusca && bateStatus;
    });
  }, [profissionais, busca, statusFiltro]);

  if (loading || !acessoCarregado) {
    return <div className="p-6 text-sm text-zinc-600">Carregando profissionais...</div>;
  }

  if (permissoes && !permissoes.profissionais_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar Profissionais.
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
              <h1 className="text-2xl font-bold md:text-3xl">Profissionais</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Gerencie o time do salão com edição, status, cadastro separado e assistentes.
              </p>
            </div>

            {podeGerenciar ? (
              <Link
                href="/profissionais/novo"
                className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
              >
                + Novo profissional
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
              placeholder="Buscar por nome, cargo, categoria ou e-mail"
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
            <div className="p-6 text-sm text-zinc-600">
              Nenhum profissional encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Profissional
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Cargo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Contato
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Assistentes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      App
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
                    const ativo = item.ativo ?? item.status === "ativo";

                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                              {item.foto_url ? (
                                <img
                                  src={item.foto_url}
                                  alt={item.nome}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-500">
                                  {item.nome?.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="font-semibold text-zinc-900">{item.nome}</p>
                              <p className="text-sm text-zinc-500">
                                {item.nome_social || item.categoria || "Sem descrição"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {item.cargo || item.categoria || "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          <div>{item.whatsapp || item.telefone || "-"}</div>
                          <div className="text-zinc-500">{item.email || ""}</div>
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {item.total_assistentes ?? 0}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              item.app_ativo
                                ? "bg-sky-100 text-sky-700"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {item.app_ativo ? "Liberado" : "Sem acesso"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              ativo
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            {podeGerenciar ? (
                              <>
                                <Link
                                  href={`/profissionais/${item.id}`}
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
                                  {ativo ? "Inativar" : "Ativar"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => excluirProfissional(item.id)}
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
