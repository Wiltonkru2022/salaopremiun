"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import AppLoading from "@/components/ui/AppLoading";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import { getErrorMessage } from "@/lib/get-error-message";
import { createClient } from "@/lib/supabase/client";

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
  tipo_profissional?: string | null;
  tipo_vinculo?: string | null;
  nivel_acesso?: string | null;
  comissao_produto_percentual?: number | null;
  pix_tipo?: string | null;
  pix_chave?: string | null;
};

type Permissoes = Record<string, boolean>;

export default function ProfissionaisListPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<
    "todos" | "ativo" | "inativo"
  >("todos");
  const [idSalao, setIdSalao] = useState("");
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalParaExcluir, setProfissionalParaExcluir] =
    useState<Profissional | null>(null);
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
      router.replace("/login?motivo=sessao_expirada");
      return null;
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id, id_salao, nivel, status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (usuarioError || !usuario?.id || !usuario?.id_salao) {
      setErro("Nao foi possivel validar o usuario do sistema.");
      return null;
    }

    if (usuario.status && usuario.status !== "ativo") {
      setErro("Usuario inativo. Fale com a administracao do salao.");
      return null;
    }

    const { data: permissoesDb } = await supabase
      .from("usuarios_permissoes")
      .select("agenda_criar, agenda_editar, agenda_excluir, agenda_ver, caixa_fechar, caixa_operar, caixa_ver, clientes_criar, clientes_editar, clientes_excluir, clientes_ver, comandas_criar, comandas_editar, comandas_excluir, comandas_ver, comissoes_pagar, comissoes_ver, configuracoes_editar, configuracoes_ver, estoque_movimentar, estoque_ver, id, id_salao, id_usuario, produtos_criar, produtos_editar, produtos_excluir, produtos_ver, profissionais_criar, profissionais_editar, profissionais_excluir, profissionais_ver, relatorios_ver, servicos_criar, servicos_editar, servicos_excluir, servicos_ver, vendas_excluir, vendas_reabrir, vendas_ver")
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

    if (!permissoesFinal.profissionais_ver) {
      router.replace("/dashboard?motivo=sem_permissao");
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
        .select(
          [
            "id",
            "nome",
            "nome_social",
            "categoria",
            "cargo",
            "telefone",
            "whatsapp",
            "email",
            "foto_url",
            "status",
            "ativo",
            "tipo_profissional",
            "tipo_vinculo",
            "nivel_acesso",
            "comissao_produto_percentual",
            "pix_tipo",
            "pix_chave",
          ].join(", ")
        )
        .eq("id_salao", salaoId)
        .order("nome", { ascending: true });

      if (error) throw error;

      const listaBase = ((data ?? []) as unknown as Profissional[]) || [];

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

      setProfissionais(
        listaBase.map((item) => ({
          ...item,
          total_assistentes: totalPorProfissional.get(item.id) || 0,
          app_ativo: acessoPorProfissional.get(item.id) || false,
        }))
      );
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
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao carregar profissionais."));
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, carregarProfissionais]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function processarProfissional(params: {
    acao: "alterar_status" | "excluir";
    idProfissional: string;
    ativo?: boolean;
  }) {
    const response = await fetch("/api/profissionais/processar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        acao: params.acao,
        idSalao,
        idProfissional: params.idProfissional,
        profissional:
          params.acao === "alterar_status"
            ? {
                ativo: params.ativo,
              }
            : undefined,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      ativo?: boolean;
      status?: string;
    };

    if (!response.ok) {
      throw new Error(result.error || "Erro ao processar profissional.");
    }

    return result;
  }

  async function alternarStatus(profissional: Profissional) {
    if (!podeGerenciar) {
      setErro("Voce nao tem permissao para alterar status de profissionais.");
      return;
    }

    try {
      setSavingId(profissional.id);
      setErro("");
      setMsg("");

      const novoAtivo = !(profissional.ativo ?? profissional.status === "ativo");
      const novoStatus = novoAtivo ? "ativo" : "inativo";

      await processarProfissional({
        acao: "alterar_status",
        idProfissional: profissional.id,
        ativo: novoAtivo,
      });

      setProfissionais((prev) =>
        prev.map((item) =>
          item.id === profissional.id
            ? {
                ...item,
                ativo: novoAtivo,
                status: novoStatus,
                app_ativo: novoAtivo ? item.app_ativo : false,
              }
            : item
        )
      );

      setMsg(
        `Profissional ${novoAtivo ? "ativado" : "inativado"} com sucesso.`
      );
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao alterar status do profissional."));
    } finally {
      setSavingId(null);
    }
  }

  async function excluirProfissional(id: string) {
    if (!podeGerenciar) {
      setErro("Voce nao tem permissao para excluir profissionais.");
      return;
    }

    try {
      setSavingId(id);
      setErro("");
      setMsg("");

      await processarProfissional({
        acao: "excluir",
        idProfissional: id,
      });

      setProfissionais((prev) => prev.filter((item) => item.id !== id));
      setProfissionalParaExcluir(null);
      setMsg("Profissional excluido com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao excluir profissional."));
    } finally {
      setSavingId(null);
    }
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return profissionais.filter((item) => {
      const bateBusca =
        !termo ||
        item.nome?.toLowerCase().includes(termo) ||
        item.nome_social?.toLowerCase().includes(termo) ||
        item.categoria?.toLowerCase().includes(termo) ||
        item.cargo?.toLowerCase().includes(termo) ||
        item.email?.toLowerCase().includes(termo);

      const ativoAtual = item.ativo ?? item.status === "ativo";
      const bateStatus =
        statusFiltro === "todos" ||
        (statusFiltro === "ativo" && ativoAtual) ||
        (statusFiltro === "inativo" && !ativoAtual);

      return bateBusca && bateStatus;
    });
  }, [profissionais, busca, statusFiltro]);

  const resumo = useMemo(() => {
    const ativos = listaFiltrada.filter(
      (item) => item.ativo ?? item.status === "ativo"
    );
    const appLiberado = listaFiltrada.filter((item) => item.app_ativo);
    const assistentes = listaFiltrada.filter(
      (item) => item.tipo_profissional === "assistente"
    );
    const comAjudantes = listaFiltrada.filter(
      (item) => Number(item.total_assistentes || 0) > 0
    );

    return {
      total: listaFiltrada.length,
      ativos: ativos.length,
      appLiberado: appLiberado.length,
      assistentes: assistentes.length,
      comAjudantes: comAjudantes.length,
    };
  }, [listaFiltrada]);

  if (loading || !acessoCarregado) {
    return (
      <AppLoading
        title="Carregando profissionais"
        message="Aguarde enquanto preparamos equipe, acessos, categorias e indicadores operacionais."
        fullHeight={false}
      />
    );
  }

  if (permissoes && !permissoes.profissionais_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Voce nao tem permissao para acessar Profissionais.
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmActionModal
        open={Boolean(profissionalParaExcluir)}
        title="Excluir profissional"
        description={`Confirme a exclusao de ${
          profissionalParaExcluir?.nome || "este profissional"
        }. Se ele ja participou da operacao do salao, o sistema vai bloquear e pedir inativacao.`}
        confirmLabel="Excluir profissional"
        tone="danger"
        loading={Boolean(
          profissionalParaExcluir && savingId === profissionalParaExcluir.id
        )}
        onClose={() => {
          if (!savingId) setProfissionalParaExcluir(null);
        }}
        onConfirm={() => {
          if (profissionalParaExcluir) {
            void excluirProfissional(profissionalParaExcluir.id);
          }
        }}
      />

      <div className="bg-white">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[28px] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Time e acesso
                </div>
                <h1 className="mt-1 text-[1.95rem] font-bold tracking-[-0.04em] md:text-[2.1rem]">
                  Profissionais
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                  Equipe, comissao, acesso e apoio em uma leitura mais curta
                  para a operacao do salao.
                </p>
              </div>

              {podeGerenciar ? (
                <Link
                  href="/profissionais/novo"
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Novo profissional
                </Link>
              ) : null}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ResumoCard
              title="Profissionais ativos"
              value={`${resumo.ativos}`}
              description={`${resumo.total} registros no filtro atual`}
              icon={Users}
            />
            <ResumoCard
              title="App liberado"
              value={`${resumo.appLiberado}`}
              description="Perfis com acesso ao app profissional"
              icon={KeyRound}
            />
            <ResumoCard
              title="Assistentes"
              value={`${resumo.assistentes}`}
              description="Cadastros marcados como assistente"
              icon={Sparkles}
            />
            <ResumoCard
              title="Com apoio vinculado"
              value={`${resumo.comAjudantes}`}
              description="Profissionais com assistentes ligados"
              icon={ShieldCheck}
            />
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

          <section className="rounded-[26px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.7fr)_210px_210px]">
              <input
                type="text"
                placeholder="Buscar por nome, cargo, categoria ou e-mail"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
              />

              <select
                value={statusFiltro}
                onChange={(e) =>
                  setStatusFiltro(
                    e.target.value as "todos" | "ativo" | "inativo"
                  )
                }
                className="w-full rounded-2xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
              >
                <option value="todos">Todos os status</option>
                <option value="ativo">Apenas ativos</option>
                <option value="inativo">Apenas inativos</option>
              </select>

              <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600">
                Pessoas visiveis:
                <strong className="ml-2 text-zinc-900">
                  {listaFiltrada.length}
                </strong>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            {listaFiltrada.length === 0 ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
                Nenhum profissional encontrado com esse filtro.
              </div>
            ) : (
              listaFiltrada.map((item) => {
                const ativo = item.ativo ?? item.status === "ativo";
                const isAssistente = item.tipo_profissional === "assistente";
                const nomeExibicao = item.nome_social || item.nome;

                return (
                  <article
                    key={item.id}
                    className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm"
                  >
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_220px] xl:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <Avatar profissional={item} />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-[1.05rem] font-semibold text-zinc-950">
                                {item.nome}
                              </h2>
                              <StatusBadge ativo={ativo} />
                              <RoleBadge isAssistente={isAssistente} />
                              {item.app_ativo ? (
                                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                                  App liberado
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1.5 text-sm text-zinc-500">
                              {[
                                nomeExibicao !== item.nome ? nomeExibicao : null,
                                item.cargo || item.categoria,
                                item.tipo_vinculo,
                              ]
                                .filter(Boolean)
                                .join(" • ") || "Sem cargo, categoria ou vinculo informado"}
                            </p>

                            <div className="mt-2.5 flex flex-wrap gap-2 text-xs text-zinc-500">
                              <TagHint>{item.email || "Sem e-mail"}</TagHint>
                              <TagHint>
                                {item.whatsapp || item.telefone || "Sem telefone"}
                              </TagHint>
                              <TagHint>
                                {item.nivel_acesso
                                  ? `Acesso: ${formatNivelAcesso(item.nivel_acesso)}`
                                  : "Sem nivel de acesso definido"}
                              </TagHint>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2.5">
                              <MetricBlock
                                label="Funcao"
                                value={item.cargo || item.categoria || "-"}
                                detail="Papel principal no salao"
                              />
                              <MetricBlock
                                label="Assistentes"
                                value={`${item.total_assistentes || 0}`}
                                detail="Apoios vinculados"
                              />
                              <MetricBlock
                                label="Comissao produto"
                                value={`${Number(
                                  item.comissao_produto_percentual || 0
                                ).toFixed(2)}%`}
                                detail="Base usada em revenda"
                              />
                              <MetricBlock
                                label="PIX"
                                value={item.pix_tipo || "-"}
                                detail={
                                  item.pix_chave
                                    ? "Chave pronta para repasse"
                                    : "Sem chave cadastrada"
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 xl:self-start xl:justify-end">
                        <Link
                          href={`/profissionais/${item.id}`}
                          className="inline-flex min-w-[108px] items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                        >
                          Abrir
                        </Link>

                        {podeGerenciar ? (
                          <>
                            <button
                              type="button"
                              onClick={() => alternarStatus(item)}
                              disabled={savingId === item.id}
                              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                            >
                              {ativo ? "Inativar" : "Ativar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setProfissionalParaExcluir(item)}
                              disabled={savingId === item.id}
                              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                            >
                              Excluir
                            </button>
                          </>
                        ) : (
                          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-medium text-zinc-500">
                            Somente leitura
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function ResumoCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            {title}
          </div>
          <div className="mt-2 text-2xl font-semibold text-zinc-950">{value}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex min-w-[185px] flex-1 items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          {label}
        </div>
        <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{detail}</p>
      </div>
      <div className="shrink-0 text-base font-semibold text-zinc-950">{value}</div>
    </div>
  );
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        ativo ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"
      }`}
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

function RoleBadge({ isAssistente }: { isAssistente: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isAssistente
          ? "bg-violet-100 text-violet-700"
          : "bg-zinc-100 text-zinc-700"
      }`}
    >
      {isAssistente ? "Assistente" : "Profissional"}
    </span>
  );
}

function TagHint({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">
      {children}
    </span>
  );
}

function Avatar({ profissional }: { profissional: Profissional }) {
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
      {profissional.foto_url ? (
        <img
          src={profissional.foto_url}
          alt={profissional.nome}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-500">
          {profissional.nome?.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function formatNivelAcesso(value: string) {
  if (value === "proprio") return "propria agenda";
  if (value === "todos") return "agenda completa";
  if (value === "sem_acesso") return "sem acesso";
  return value;
}
