"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CircleHelp, Clock3, Percent, Wallet } from "lucide-react";
import { ComissaoHelpPanel } from "@/components/comissoes/ComissaoHelpPanel";
import AppLoading from "@/components/ui/AppLoading";
import AppModal from "@/components/ui/AppModal";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import { getErrorMessage } from "@/lib/get-error-message";
import { createClient } from "@/lib/supabase/client";
import type {
  ServicoProcessarErrorResponse,
  ServicoProcessarResponse,
} from "@/types/servicos";

type ServicoListItem = {
  id: string;
  nome: string;
  categoria?: string | null;
  descricao?: string | null;
  duracao_minutos?: number | null;
  pausa_minutos?: number | null;
  preco_padrao?: number | null;
  preco_variavel?: boolean | null;
  custo_produto?: number | null;
  comissao_percentual_padrao?: number | null;
  exige_avaliacao?: boolean | null;
  gatilho_retorno_dias?: number | null;
  status?: string | null;
  ativo?: boolean | null;
  eh_combo?: boolean | null;
  combo_resumo?: string | null;
};

type Permissoes = Record<string, boolean>;

function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMinutes(value?: number | null) {
  const total = Number(value || 0);
  if (!total) return "Sem tempo definido";
  if (total < 60) return `${total} min`;

  const horas = Math.floor(total / 60);
  const minutos = total % 60;
  if (!minutos) return `${horas}h`;
  return `${horas}h ${minutos}min`;
}

export default function ServicosPage() {
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
  const [servicos, setServicos] = useState<ServicoListItem[]>([]);
  const [servicoParaExcluir, setServicoParaExcluir] =
    useState<ServicoListItem | null>(null);
  const [ajudaOpen, setAjudaOpen] = useState(false);
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

    if (!permissoesFinal.servicos_ver) {
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
      const salaoIdFinal = usuarioLogado?.idSalao || acesso.idSalao;

      setIdSalao(salaoIdFinal);

      const { data, error } = await supabase
        .from("servicos")
        .select(
          [
            "id",
            "nome",
            "categoria",
            "descricao",
            "duracao_minutos",
            "pausa_minutos",
            "preco_padrao",
            "preco_variavel",
            "custo_produto",
            "comissao_percentual_padrao",
            "exige_avaliacao",
            "gatilho_retorno_dias",
            "status",
            "ativo",
            "eh_combo",
            "combo_resumo",
          ].join(", ")
        )
        .eq("id_salao", salaoIdFinal)
        .order("nome", { ascending: true });

      if (error) throw error;

      setServicos(((data ?? []) as unknown as ServicoListItem[]) || []);
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao carregar servicos."));
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, supabase]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function processarServico(params: {
    acao: "salvar" | "alterar_status" | "excluir";
    servico: Record<string, unknown>;
  }) {
    const response = await fetch("/api/servicos/processar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idSalao,
        acao: params.acao,
        servico: params.servico,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as Partial<
      ServicoProcessarResponse
    > &
      ServicoProcessarErrorResponse;

    if (!response.ok) {
      throw new Error(result.error || "Erro ao processar servico.");
    }

    return result as ServicoProcessarResponse;
  }

  async function alternarStatus(servico: ServicoListItem) {
    if (!podeGerenciar) {
      setErro("Voce nao tem permissao para alterar status de servicos.");
      return;
    }

    try {
      setSavingId(servico.id);
      setErro("");
      setMsg("");

      const novoAtivo = !(servico.ativo ?? servico.status === "ativo");
      const novoStatus = novoAtivo ? "ativo" : "inativo";

      await processarServico({
        acao: "alterar_status",
        servico: {
          id: servico.id,
          ativo: novoAtivo,
        },
      });

      setServicos((prev) =>
        prev.map((item) =>
          item.id === servico.id
            ? { ...item, ativo: novoAtivo, status: novoStatus }
            : item
        )
      );

      setMsg(`Servico ${novoAtivo ? "ativado" : "inativado"} com sucesso.`);
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao alterar status do servico."));
    } finally {
      setSavingId(null);
    }
  }

  async function excluirServico(id: string) {
    if (!podeGerenciar) {
      setErro("Voce nao tem permissao para excluir servicos.");
      return;
    }

    try {
      setSavingId(id);
      setErro("");
      setMsg("");

      await processarServico({
        acao: "excluir",
        servico: { id },
      });

      setServicos((prev) => prev.filter((item) => item.id !== id));
      setServicoParaExcluir(null);
      setMsg("Servico excluido com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao excluir servico."));
    } finally {
      setSavingId(null);
    }
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return servicos.filter((item) => {
      const ativoAtual = item.ativo ?? item.status === "ativo";
      const bateBusca =
        !termo ||
        item.nome?.toLowerCase().includes(termo) ||
        item.categoria?.toLowerCase().includes(termo) ||
        item.descricao?.toLowerCase().includes(termo);

      const bateStatus =
        statusFiltro === "todos" ||
        (statusFiltro === "ativo" && ativoAtual) ||
        (statusFiltro === "inativo" && !ativoAtual);

      return bateBusca && bateStatus;
    });
  }, [busca, servicos, statusFiltro]);

  const resumo = useMemo(() => {
    const ativos = listaFiltrada.filter(
      (item) => item.ativo ?? item.status === "ativo"
    );
    const precosVariaveis = listaFiltrada.filter((item) => item.preco_variavel);
    const comAvaliacao = listaFiltrada.filter((item) => item.exige_avaliacao);
    const ticketMedio =
      listaFiltrada.length > 0
        ? listaFiltrada.reduce((acc, item) => acc + Number(item.preco_padrao || 0), 0) /
          listaFiltrada.length
        : 0;

    return {
      total: listaFiltrada.length,
      ativos: ativos.length,
      precosVariaveis: precosVariaveis.length,
      comAvaliacao: comAvaliacao.length,
      ticketMedio,
    };
  }, [listaFiltrada]);

  if (loading || !acessoCarregado) {
    return (
      <AppLoading
        title="Carregando servicos"
        message="Aguarde enquanto organizamos duracao, comissao, preco e regras do catalogo."
        fullHeight={false}
      />
    );
  }

  if (permissoes && !permissoes.servicos_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Voce nao tem permissao para acessar Servicos.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-[24px] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                <span>Catalogo operacional</span>
                <button
                  type="button"
                  onClick={() => setAjudaOpen(true)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700"
                  aria-label="Abrir ajuda da pagina de servicos"
                  title="Ajuda"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </button>
              </div>
              <h1 className="mt-2 text-2xl font-bold md:text-3xl">Servicos</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                Aqui ficam as regras que alimentam agenda, comandas, caixa,
                vendas e comissoes: preco, duracao, custo, comissao por
                profissional e agora tambem combos com varios servicos e um
                preco final unico.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/servicos/combos/novo"
                className="inline-flex items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                Criar combo
              </Link>

              <Link
                href="/servicos-extras"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                Servicos extras
              </Link>

              {podeGerenciar ? (
                <Link
                  href="/servicos/novo"
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Novo servico
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard
            title="Servicos ativos"
            value={`${resumo.ativos}`}
            description={`${resumo.total} visiveis na tela agora`}
            icon={Clock3}
          />
          <ResumoCard
            title="Ticket base medio"
            value={formatCurrency(resumo.ticketMedio)}
            description="Preco padrao medio do catalogo filtrado"
            icon={Wallet}
          />
          <ResumoCard
            title="Preco sob avaliacao"
            value={`${resumo.precosVariaveis}`}
            description="Itens que precisam de combinacao antes de fechar"
            icon={AlertTriangle}
          />
          <ResumoCard
            title="Exigem leitura atenta"
            value={`${resumo.comAvaliacao}`}
            description="Servicos que pedem avaliacao antes da execucao"
            icon={Percent}
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

        <section className="rounded-[22px] border border-zinc-200 bg-white p-3.5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_220px_220px]">
            <input
              type="text"
              placeholder="Buscar por nome, categoria ou descricao"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
            />

            <select
              value={statusFiltro}
              onChange={(e) =>
                setStatusFiltro(e.target.value as "todos" | "ativo" | "inativo")
              }
              className="w-full rounded-2xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Apenas ativos</option>
              <option value="inativo">Apenas inativos</option>
            </select>

            <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600">
              Catalogo filtrado:
              <strong className="ml-2 text-zinc-900">{listaFiltrada.length}</strong>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {listaFiltrada.length === 0 ? (
            <div className="rounded-[22px] border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm">
              Nenhum servico encontrado com esse filtro.
            </div>
          ) : (
            listaFiltrada.map((item) => {
              const ativo = item.ativo ?? item.status === "ativo";
              const pausa = Number(item.pausa_minutos || 0);
              const precoVariavel = Boolean(item.preco_variavel);
              const ehCombo = Boolean(item.eh_combo);
              const hrefEdicao = ehCombo ? `/servicos/combos/${item.id}` : `/servicos/${item.id}`;

              return (
                <article
                  key={item.id}
                  className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[1rem] font-semibold text-zinc-950">
                          {item.nome}
                        </h2>
                        <StatusBadge ativo={ativo} />
                        {ehCombo ? (
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                            Combo
                          </span>
                        ) : null}
                        {precoVariavel ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Sob avaliacao
                          </span>
                        ) : null}
                        {item.exige_avaliacao ? (
                          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                            Exige avaliacao
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        {item.categoria || "Sem categoria"}
                      </p>

                      {item.descricao ? (
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                          {item.descricao}
                        </p>
                      ) : null}

                      {ehCombo && item.combo_resumo ? (
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-violet-700">
                          Itens do combo: {item.combo_resumo}
                        </p>
                      ) : null}

                      <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                        <MetricBlock
                          label="Tempo operacional"
                          value={formatMinutes(item.duracao_minutos)}
                          detail={
                            pausa > 0 ? `${pausa} min de pausa apos o atendimento` : "Sem pausa adicional"
                          }
                        />
                        <MetricBlock
                          label="Preco base"
                          value={
                            precoVariavel
                              ? `A partir de ${formatCurrency(item.preco_padrao)}`
                              : formatCurrency(item.preco_padrao)
                          }
                          detail="Valor exibido para a recepcao como base do servico"
                        />
                        <MetricBlock
                          label="Custo previsto"
                          value={formatCurrency(item.custo_produto)}
                          detail="Ajuda a enxergar margem e impacto de consumo"
                        />
                        <MetricBlock
                          label="Comissao padrao"
                          value={
                            ehCombo
                              ? "Por servico"
                              : `${formatPercent(item.comissao_percentual_padrao)}%`
                          }
                          detail={
                            ehCombo
                              ? "Cada servico interno mantem a propria regra de comissao"
                              : "Vale enquanto nao houver excecao por profissional"
                          }
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                        {item.gatilho_retorno_dias ? (
                          <TagHint>{`Retorno sugerido em ${item.gatilho_retorno_dias} dias`}</TagHint>
                        ) : null}
                        <TagHint>Excecoes e consumo ficam no detalhe do servico</TagHint>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 xl:w-48">
                      <Link
                        href={hrefEdicao}
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        {ehCombo ? "Editar combo" : "Editar servico"}
                      </Link>

                      <Link
                        href={hrefEdicao}
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                      >
                        {ehCombo ? "Ver composicao" : "Ver excecoes"}
                      </Link>

                      {podeGerenciar ? (
                        <>
                          <button
                            type="button"
                            onClick={() => alternarStatus(item)}
                            disabled={savingId === item.id}
                            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                          >
                            {ativo ? "Inativar" : "Ativar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setServicoParaExcluir(item)}
                            disabled={savingId === item.id}
                            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            Excluir
                          </button>
                        </>
                      ) : (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-medium text-zinc-500">
                          Somente leitura para seu perfil.
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

      <ConfirmActionModal
        open={Boolean(servicoParaExcluir)}
        title="Excluir servico"
        description={`Confirme a exclusao de ${
          servicoParaExcluir?.nome || "este servico"
        }.`}
        confirmLabel="Excluir servico"
        tone="danger"
        loading={Boolean(servicoParaExcluir && savingId === servicoParaExcluir.id)}
        onClose={() => {
          if (!savingId) setServicoParaExcluir(null);
        }}
        onConfirm={() => {
          if (servicoParaExcluir) void excluirServico(servicoParaExcluir.id);
        }}
      />

      <AppModal
        open={ajudaOpen}
        onClose={() => setAjudaOpen(false)}
        title="Ajuda de comissao e operacao"
        description="Regras de comissao, taxa e excecao ficam aqui quando voce precisar consultar."
        maxWidthClassName="max-w-5xl"
        bodyClassName="bg-[#f7f8fb]"
      >
        <ComissaoHelpPanel
          eyebrow="Comissao"
          title="Padrao primeiro. Excecao so quando fizer sentido."
          description="Defina a regra principal no servico. Quando um profissional foge do padrao, ajuste somente aquele vinculo."
          steps={[
            {
              title: "Regra padrao",
              description:
                "A comissao da lista vale para o servico inteiro ate que voce crie uma excecao por profissional.",
            },
            {
              title: "Excecao pontual",
              description:
                "Use o detalhe do servico para mudar preco, duracao, base ou comissao apenas para quem precisa.",
            },
            {
              title: "Taxa de maquininha",
              description:
                "A taxa geral fica em Configuracoes. Aqui voce decide se ela entra ou nao no calculo da comissao.",
            },
          ]}
        >
          <div className="flex flex-wrap gap-3">
            <Link
              href="/configuracoes"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Abrir Configuracoes
            </Link>
          </div>
        </ComissaoHelpPanel>
      </AppModal>
    </div>
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
  icon: typeof Clock3;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            {title}
          </div>
          <div className="mt-1.5 text-xl font-semibold text-zinc-950">{value}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 text-zinc-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-sm leading-5 text-zinc-600">{description}</p>
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
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1.5 text-[15px] font-semibold text-zinc-950">{value}</div>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
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
