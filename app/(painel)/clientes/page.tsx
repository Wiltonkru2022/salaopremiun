"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, HeartHandshake, Mail, Users } from "lucide-react";
import { usePlanoAccessSnapshot } from "@/components/plans/usePlanoAccessSnapshot";
import AppLoading from "@/components/ui/AppLoading";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import { getErrorMessage } from "@/lib/get-error-message";
import { getPlanoMinimoParaRecurso } from "@/lib/plans/catalog";
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
};

type Permissoes = Record<string, boolean>;

export default function ClientesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { planoAccess } = usePlanoAccessSnapshot(true);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<
    "todos" | "ativo" | "inativo"
  >("todos");
  const [idSalao, setIdSalao] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(
    null
  );
  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [nivel, setNivel] = useState("");
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const podeGerenciar = nivel === "admin" || nivel === "gerente";
  const whatsappLiberado =
    planoAccess?.recursos?.whatsapp === true || planoAccess?.recursos?.marketing === true;
  const comunicacaoUpgradeTarget = getPlanoMinimoParaRecurso("marketing");

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

    if (!permissoesFinal.clientes_ver) {
      router.replace("/dashboard?motivo=sem_permissao");
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

      const usuarioLogado = await getUsuarioLogado();
      const idSalaoAtual = usuarioLogado?.idSalao || acesso.idSalao;
      setIdSalao(idSalaoAtual);

      const { data, error } = await supabase
        .from("clientes")
        .select(
          "id, nome, cashback, whatsapp, telefone, email, bairro, profissao, status, ativo, created_at"
        )
        .eq("id_salao", idSalaoAtual)
        .order("nome", { ascending: true });

      if (error) throw error;

      setClientes(((data ?? []) as unknown as Cliente[]) || []);
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao carregar clientes."));
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, supabase]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

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
      setErro("Voce nao tem permissao para alterar status de clientes.");
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
      setErro("Voce nao tem permissao para excluir clientes.");
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
      setMsg("Cliente excluido com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao excluir cliente."));
    } finally {
      setSavingId(null);
    }
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return clientes.filter((item) => {
      const ativoAtual = item.ativo ?? item.status === "ativo";
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
  }, [busca, clientes, statusFiltro]);

  const resumo = useMemo(() => {
    const ativos = listaFiltrada.filter(
      (item) => item.ativo ?? item.status === "ativo"
    );
    const comWhatsapp = listaFiltrada.filter((item) => item.whatsapp);
    const comEmail = listaFiltrada.filter((item) => item.email);
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
      novos30dias: novos30dias.length,
    };
  }, [listaFiltrada]);

  if (loading || !acessoCarregado) {
    return (
      <AppLoading
        title="Carregando clientes"
        message="Aguarde enquanto montamos cadastro, relacionamento e historico das clientes."
        fullHeight={false}
      />
    );
  }

  if (permissoes && !permissoes.clientes_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Voce nao tem permissao para acessar Clientes.
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
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[28px] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Relacao com cliente
                </div>
                <h1 className="mt-1 text-[1.95rem] font-bold tracking-[-0.04em] md:text-[2.1rem]">
                  Clientes
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                  Contato, credito e historico em uma leitura mais direta para a
                  recepcao.
                </p>
              </div>

              {podeGerenciar ? (
                <Link
                  href="/clientes/novo"
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Novo cliente
                </Link>
              ) : null}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <ResumoCard
              title="Clientes ativos"
              value={`${resumo.ativos}`}
              description={`${resumo.total} visiveis no filtro atual`}
              icon={Users}
            />
            <ResumoCard
              title="Credito em aberto"
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
                  ? "Cadastros com contato rapido para confirmacao"
                  : "Contatos prontos para uso quando o modulo de comunicacao for liberado"
              }
              icon={HeartHandshake}
            />
            <ResumoCard
              title="E-mail preenchido"
              value={`${resumo.comEmail}`}
              description={
                whatsappLiberado
                  ? "Ajuda em recibo, marketing e acesso futuro"
                  : "Ajuda em recibo, comunicacao futura e acesso posterior"
              }
              icon={Mail}
            />
            <ResumoCard
              title="Novas em 30 dias"
              value={`${resumo.novos30dias}`}
              description="Leitura rapida da base mais recente"
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
            <section className="rounded-[26px] border border-sky-200 bg-sky-50 p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-bold text-sky-950">
                    Comunicação premium bloqueada no plano atual
                  </div>
                  <p className="mt-1 text-sm leading-6 text-sky-900">
                    Os contatos de WhatsApp e e-mail continuam salvos para a recepção. Disparos, campanhas e automações entram quando o salão sobe para Pro ou Premium.
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
                    href={`/assinatura?plano=${comunicacaoUpgradeTarget}`}
                    className="inline-flex items-center justify-center rounded-full bg-sky-900 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-95"
                  >
                    Fazer upgrade
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[26px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_220px_220px]">
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
                    className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm"
                  >
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_240px] xl:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-zinc-950">
                            {item.nome}
                          </h2>
                          <StatusBadge ativo={ativoAtual} />
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

                        <p className="mt-2 text-sm text-zinc-500">
                          {item.email || "Sem e-mail"}{" "}
                          {item.created_at
                            ? `• cadastro em ${new Date(
                                item.created_at
                              ).toLocaleDateString("pt-BR")}`
                            : ""}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
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

                      <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                        <Link
                          href={`/clientes/${item.id}`}
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
                              {ativoAtual ? "Inativar" : "Ativar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setClienteParaExcluir(item)}
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

function TagHint({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">
      {children}
    </span>
  );
}
