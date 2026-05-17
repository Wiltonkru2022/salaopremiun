"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, HeartHandshake, Mail, Users } from "lucide-react";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import { usePlanoAccessSnapshot } from "@/components/plans/usePlanoAccessSnapshot";
import AppLoading from "@/components/ui/AppLoading";
import AppModal from "@/components/ui/AppModal";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import PaginationControls from "@/components/ui/PaginationControls";
import { getErrorMessage } from "@/lib/get-error-message";
import { getPlanoMinimoParaRecurso } from "@/lib/plans/catalog";
import { getAssinaturaUrl } from "@/lib/site-urls";
import { createClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  nome: string;
  cashback?: number | null;
  whatsapp?: string | null;
  telefone?: string | null;
  email?: string | null;
  bairro?: string | null;
  profissao?: string | null;
  status?: string | null;
  ativo?: boolean | null;
  created_at?: string | null;
  appStatus?: "conectado" | "pendente";
};

type Permissoes = Record<string, boolean>;
const CLIENTES_PAGE_SIZE = 10;

export default function ClientesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { snapshot: painelSession } = usePainelSession();
  const { planoAccess } = usePlanoAccessSnapshot(true);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<
    "todos" | "ativo" | "inativo"
  >("todos");
  const [appFiltro, setAppFiltro] = useState<"todos" | "conectados" | "pendentes">(
    "todos"
  );
  const [idSalao, setIdSalao] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesPage, setClientesPage] = useState(0);
  const [clientesHasMore, setClientesHasMore] = useState(false);
  const [clientesTotal, setClientesTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(
    null
  );
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [nivel, setNivel] = useState("");
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const podeGerenciar = nivel === "admin" || nivel === "gerente";
  const whatsappLiberado = planoAccess?.recursos?.whatsapp === true;
  const comunicacaoUpgradeTarget = getPlanoMinimoParaRecurso("whatsapp");

  const carregarAcesso = useCallback(async () => {
    if (!painelSession?.idSalao || !painelSession?.permissoes) {
      router.replace("/login?motivo=sessao_expirada");
      return null;
    }
    const permissoesFinal = painelSession.permissoes as Permissoes;
    const nivelAtual = String(painelSession.nivel || "").toLowerCase();

    setPermissoes(permissoesFinal);
    setNivel(nivelAtual);
    setIdSalao(painelSession.idSalao);
    setAcessoCarregado(true);

    if (!permissoesFinal.clientes_ver) {
      router.replace("/dashboard?motivo=sem_permissao");
      return null;
    }

    if (painelSession.planoRecursos?.clientes === false) {
      router.replace("/meu-plano?motivo=recurso_clientes_bloqueado");
      return null;
    }

    return {
      idSalao: painelSession.idSalao,
      nivel: nivelAtual,
      permissoes: permissoesFinal,
    };
  }, [painelSession, router]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setBuscaAplicada(busca.trim());
    }, 300);

    return () => window.clearTimeout(handle);
  }, [busca]);

  const carregarClientes = useCallback(
    async (salaoId: string, page = 0, append = false) => {
      const from = page * CLIENTES_PAGE_SIZE;
      const to = from + CLIENTES_PAGE_SIZE - 1;

      let query = supabase
        .from("clientes")
        .select(
          "id, nome, cashback, whatsapp, telefone, email, bairro, profissao, status, ativo, created_at",
          { count: "exact" }
        )
        .eq("id_salao", salaoId)
        .order("nome", { ascending: true });

      if (statusFiltro !== "todos") {
        query = query.eq("status", statusFiltro);
      }

      if (buscaAplicada) {
        query = query.or(
          [
            `nome.ilike.%${buscaAplicada}%`,
            `whatsapp.ilike.%${buscaAplicada}%`,
            `telefone.ilike.%${buscaAplicada}%`,
            `email.ilike.%${buscaAplicada}%`,
            `bairro.ilike.%${buscaAplicada}%`,
            `profissao.ilike.%${buscaAplicada}%`,
          ].join(",")
        );
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      const rows = ((data ?? []) as unknown as Cliente[]) || [];
      const ids = rows.map((item) => item.id).filter(Boolean);
      const { data: authRows } = ids.length
        ? await supabase
            .from("clientes_auth")
            .select("id_cliente, app_conta_id, app_ativo")
            .eq("id_salao", salaoId)
            .in("id_cliente", ids)
        : { data: [] };

      const conectados = new Set(
        ((authRows || []) as Array<{
          id_cliente?: string | null;
          app_conta_id?: string | null;
          app_ativo?: boolean | null;
        }>)
          .filter((item) => item.app_conta_id && item.app_ativo !== false)
          .map((item) => String(item.id_cliente || "").trim())
          .filter(Boolean)
      );
      const rowsComStatus = rows.map((item) => ({
        ...item,
        appStatus: conectados.has(item.id)
          ? ("conectado" as const)
          : ("pendente" as const),
      }));

      setClientes((prev) => (append ? [...prev, ...rowsComStatus] : rowsComStatus));
      setClientesPage(page);
      setClientesTotal(count ?? (append ? from + rows.length : rows.length));
      setClientesHasMore((count ?? 0) > to + 1);
    },
    [supabase, statusFiltro, buscaAplicada]
  );

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      setIdSalao(acesso.idSalao);
      await carregarClientes(acesso.idSalao, 0, false);
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao carregar clientes."));
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, carregarClientes]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function mudarPaginaClientes(page: number) {
    if (!idSalao || loadingMore || page < 0) return;

    try {
      setLoadingMore(true);
      setErro("");
      await carregarClientes(idSalao, page, false);
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao carregar clientes."));
    } finally {
      setLoadingMore(false);
    }
  }

  async function processarCliente(params: {
    acao: "alterar_status" | "excluir";
    idCliente: string;
    ativo?: boolean;
  }) {
    const response = await fetch("/api/clientes/processar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idSalao,
        acao: params.acao,
        cliente: {
          id: params.idCliente,
          ...(params.acao === "alterar_status" ? { ativo: params.ativo } : {}),
        },
      }),
    });

    const result = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      ativo?: boolean;
      status?: string;
    };

    if (!response.ok) {
      throw new Error(result.error || "Erro ao processar cliente.");
    }

    return result;
  }

  async function alternarStatus(cliente: Cliente) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para alterar status de clientes.");
      return;
    }

    try {
      setSavingId(cliente.id);
      setErro("");
      setMsg("");

      const ativoAtual = cliente.ativo ?? cliente.status === "ativo";
      const novoAtivo = !ativoAtual;
      const novoStatus = novoAtivo ? "ativo" : "inativo";

      await processarCliente({
        acao: "alterar_status",
        idCliente: cliente.id,
        ativo: novoAtivo,
      });

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
      setErro(getErrorMessage(e, "Erro ao alterar status do cliente."));
    } finally {
      setSavingId(null);
    }
  }

  async function excluirCliente(id: string) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para excluir clientes.");
      return;
    }

    try {
      setSavingId(id);
      setErro("");
      setMsg("");

      await processarCliente({
        acao: "excluir",
        idCliente: id,
      });

      setClientes((prev) => prev.filter((item) => item.id !== id));
      setClienteParaExcluir(null);
      setMsg("Cliente excluído com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao excluir cliente."));
    } finally {
      setSavingId(null);
    }
  }

  const listaFiltrada = useMemo(() => {
    if (appFiltro === "conectados") {
      return clientes.filter((item) => item.appStatus === "conectado");
    }

    if (appFiltro === "pendentes") {
      return clientes.filter((item) => item.appStatus !== "conectado");
    }

    return clientes;
  }, [clientes, appFiltro]);

  const resumo = useMemo(() => {
    const ativos = listaFiltrada.filter(
      (item) => item.ativo ?? item.status === "ativo"
    );
    const comWhatsapp = listaFiltrada.filter((item) => item.whatsapp);
    const comEmail = listaFiltrada.filter((item) => item.email);
    const conectadosApp = listaFiltrada.filter(
      (item) => item.appStatus === "conectado"
    );
    const novos30dias = listaFiltrada.filter((item) => {
      if (!item.created_at) return false;
      const createdAt = new Date(item.created_at).getTime();
      const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return createdAt >= limite;
    });

    return {
      total: listaFiltrada.length,
      ativos: ativos.length,
      creditoTotal: listaFiltrada.reduce(
        (acc, item) => acc + Number(item.cashback || 0),
        0
      ),
      comWhatsapp: comWhatsapp.length,
      comEmail: comEmail.length,
      conectadosApp: conectadosApp.length,
      novos30dias: novos30dias.length,
    };
  }, [listaFiltrada]);

  function buildConviteAppLink(cliente: Cliente) {
    const telefone = String(cliente.whatsapp || cliente.telefone || "").replace(
      /\D/g,
      ""
    );
    if (!telefone) return "";

    const nome = String(cliente.nome || "").trim() || "tudo bem";
    const mensagem = `Oi, ${nome}! O salão agora usa o App Cliente do SalãoPremium. Crie seu acesso com este telefone para ver salões e agendar online: https://app.salaopremiun.com.br/app-cliente/cadastro`;
    return `https://wa.me/55${telefone.replace(/^55/, "")}?text=${encodeURIComponent(
      mensagem
    )}`;
  }

  if (loading || !acessoCarregado) {
    return (
      <AppLoading
        title="Carregando clientes"
        message="Aguarde enquanto montamos cadastro, relacionamento e histórico das clientes."
        fullHeight={false}
      />
    );
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
    <>
      <ConfirmActionModal
        open={Boolean(clienteParaExcluir)}
        title="Excluir cliente"
        description={`Confirme a exclusao de ${
          clienteParaExcluir?.nome || "este cliente"
        }. Se ele ja participou de agenda ou comanda, o sistema vai bloquear e pedir inativacao.`}
        confirmLabel="Excluir cliente"
        tone="danger"
        loading={Boolean(clienteParaExcluir && savingId === clienteParaExcluir.id)}
        onClose={() => {
          if (!savingId) setClienteParaExcluir(null);
        }}
        onConfirm={() => {
          if (clienteParaExcluir) void excluirCliente(clienteParaExcluir.id);
        }}
      />

      <div className="bg-white">
        <div className="mx-auto max-w-7xl space-y-4">
          <section className="rounded-[24px] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Relacao com cliente
                </div>
                <h1 className="mt-1 text-[1.8rem] font-bold tracking-[-0.04em] md:text-[1.95rem]">
                  Clientes
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-600">
                  Contato, crédito e histórico em uma leitura mais direta para a
                  recepção.
                </p>
              </div>

              {podeGerenciar ? (
                <Link
                  href="/clientes/novo"
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Novo cliente
                </Link>
              ) : null}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <ResumoCard
              title="Clientes ativos"
              value={`${resumo.ativos}`}
              description={`${resumo.total} visiveis no filtro atual`}
              icon={Users}
            />
            <ResumoCard
              title="Crédito em aberto"
              value={resumo.creditoTotal.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
              description="Saldo que as clientes ainda podem usar no caixa"
              icon={HeartHandshake}
            />
            <ResumoCard
              title={whatsappLiberado ? "WhatsApp pronto" : "WhatsApp cadastrado"}
              value={`${resumo.comWhatsapp}`}
              description={
                whatsappLiberado
                  ? "Cadastros com contato rápido para confirmação"
                  : "Contatos prontos para uso quando o modulo de comunicacao for liberado"
              }
              icon={HeartHandshake}
            />
            <ResumoCard
              title="E-mail preenchido"
              value={`${resumo.comEmail}`}
              description={
                whatsappLiberado
                  ? "Ajuda em recibo, contato manual e acesso futuro"
                  : "Ajuda em recibo, comunicacao futura e acesso posterior"
              }
              icon={Mail}
            />
            <ResumoCard
              title="No app cliente"
              value={`${resumo.conectadosApp}`}
              description="Clientes com conta conectada e prontos para recursos digitais"
              icon={Users}
            />
            <ResumoCard
              title="Novas em 30 dias"
              value={`${resumo.novos30dias}`}
              description="Leitura rápida da base mais recente"
              icon={CalendarClock}
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

          {!whatsappLiberado ? (
            <section className="rounded-[22px] border border-sky-200 bg-sky-50 p-3.5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-bold text-sky-950">
                    Comunicacao premium bloqueada no plano atual
                  </div>
                  <p className="mt-1 text-sm leading-6 text-sky-900">
                    Os contatos de WhatsApp e e-mail continuam salvos para a recepção. Disparos, campanhas e automacoes entram quando o salão sobe para Pro ou Premium.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/comparar-planos"
                    className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-white px-4 py-2.5 text-sm font-bold text-sky-900 transition hover:bg-sky-100"
                  >
                    Comparar planos
                  </Link>
                  <Link
                    href={getAssinaturaUrl(`/assinatura?plano=${comunicacaoUpgradeTarget}`)}
                    className="inline-flex items-center justify-center rounded-full bg-sky-900 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-95"
                  >
                    Fazer upgrade
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[22px] border border-zinc-200 bg-white p-3.5 shadow-sm">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_190px_190px_220px]">
              <input
                type="text"
                placeholder="Buscar por nome, WhatsApp, e-mail, bairro ou profissao"
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

              <select
                value={appFiltro}
                onChange={(e) =>
                  setAppFiltro(
                    e.target.value as "todos" | "conectados" | "pendentes"
                  )
                }
                className="w-full rounded-2xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
              >
                <option value="todos">Todos no app</option>
                <option value="conectados">App conectado</option>
                <option value="pendentes">App pendente</option>
              </select>

              <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600">
                Pessoas visiveis:
                <strong className="ml-2 text-zinc-900">
                  {clientesTotal || listaFiltrada.length}
                </strong>
              </div>
            </div>
          </section>

        <section className="space-y-2.5">
            {listaFiltrada.length === 0 ? (
              <div className="rounded-[22px] border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm">
                Nenhum cliente encontrado com esse filtro.
              </div>
            ) : (
              listaFiltrada.map((item) => {
                const ativoAtual = item.ativo ?? item.status === "ativo";
                const contatoPrincipal =
                  item.whatsapp || item.telefone || "Sem telefone";

                return (
                  <article
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setClienteSelecionado(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setClienteSelecionado(item);
                      }
                    }}
                    className="cursor-pointer rounded-[20px] border border-zinc-200 bg-white p-3.5 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus:border-zinc-400 focus:outline-none"
                  >
                    <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)] 2xl:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[1rem] font-semibold text-zinc-950">
                            {item.nome}
                          </h2>
                          <StatusBadge ativo={ativoAtual} />
                          <AppStatusBadge status={item.appStatus} />
                          {Number(item.cashback || 0) > 0 ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                              Credito{" "}
                              {Number(item.cashback || 0).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </span>
                          ) : null}
                          {item.whatsapp ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              {whatsappLiberado ? "WhatsApp pronto" : "WhatsApp cadastrado"}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1.5 text-sm text-zinc-500">
                          {item.email || "Sem e-mail"}{" "}
                          {item.created_at
                            ? `• cadastro em ${new Date(
                                item.created_at
                              ).toLocaleDateString("pt-BR")}`
                            : ""}
                        </p>

                        <div className="mt-2.5 flex flex-wrap gap-2 text-xs text-zinc-500">
                          <TagHint>{contatoPrincipal}</TagHint>
                          {item.email ? <TagHint>{item.email}</TagHint> : null}
                          {item.bairro ? <TagHint>{item.bairro}</TagHint> : null}
                          {item.profissao ? <TagHint>{item.profissao}</TagHint> : null}
                          {item.created_at ? (
                            <TagHint>
                              Cadastro em{" "}
                              {new Date(item.created_at).toLocaleDateString("pt-BR")}
                            </TagHint>
                          ) : null}
                        </div>
                      </div>

                    </div>
                  </article>
                );
              })
            )}

            <PaginationControls
              currentPage={clientesPage}
              pageSize={CLIENTES_PAGE_SIZE}
              totalItems={clientesTotal}
              hasMore={clientesHasMore}
              onPageChange={(page) => void mudarPaginaClientes(page)}
              className={loadingMore ? "opacity-60" : ""}
            />
          </section>
        </div>
      </div>

      <AppModal
        open={Boolean(clienteSelecionado)}
        onClose={() => setClienteSelecionado(null)}
        title={clienteSelecionado?.nome || "Cliente"}
        description="Ficha rápida para conferir antes de abrir o cadastro completo."
        maxWidthClassName="max-w-4xl"
        footer={
          clienteSelecionado ? (
            <>
              <button
                type="button"
                onClick={() => setClienteSelecionado(null)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Fechar
              </button>
              {clienteSelecionado.appStatus !== "conectado" && buildConviteAppLink(clienteSelecionado) ? (
                <a
                  href={buildConviteAppLink(clienteSelecionado)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  Convidar no WhatsApp
                </a>
              ) : null}
              {podeGerenciar ? (
                <>
                  <button
                    type="button"
                    onClick={() => void alternarStatus(clienteSelecionado)}
                    disabled={savingId === clienteSelecionado.id}
                    className="rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                  >
                    {(clienteSelecionado.ativo ?? clienteSelecionado.status === "ativo") ? "Inativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setClienteParaExcluir(clienteSelecionado)}
                    disabled={savingId === clienteSelecionado.id}
                    className="rounded-2xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    Excluir
                  </button>
                </>
              ) : null}
              <Link
                href={`/clientes/${clienteSelecionado.id}`}
                className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Abrir cadastro completo
              </Link>
            </>
          ) : null
        }
      >
        {clienteSelecionado ? (
          <div className="grid gap-3 md:grid-cols-2">
            <QuickBox label="Telefone" value={clienteSelecionado.whatsapp || clienteSelecionado.telefone || "Sem telefone"} />
            <QuickBox label="E-mail" value={clienteSelecionado.email || "Sem e-mail"} />
            <QuickBox label="Bairro" value={clienteSelecionado.bairro || "Sem bairro"} />
            <QuickBox label="Profissão" value={clienteSelecionado.profissao || "Sem profissão"} />
            <QuickBox
              label="Crédito disponível"
              value={Number(clienteSelecionado.cashback || 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            />
            <QuickBox label="Status App" value={clienteSelecionado.appStatus === "conectado" ? "Conectado" : "Pendente"} />
          </div>
        ) : null}
      </AppModal>
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

function QuickBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </div>
      <div className="mt-2 break-words text-base font-bold text-zinc-950">{value}</div>
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

function AppStatusBadge({ status }: { status?: "conectado" | "pendente" }) {
  const conectado = status === "conectado";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        conectado
          ? "bg-emerald-100 text-emerald-700"
          : "bg-zinc-100 text-zinc-600"
      }`}
    >
      {conectado ? "App conectado" : "App pendente"}
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
