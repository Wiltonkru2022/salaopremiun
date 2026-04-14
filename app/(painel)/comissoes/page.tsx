"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { ComissaoHelpPanel } from "@/components/comissoes/ComissaoHelpPanel";
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Printer,
  Search,
  User2,
  XCircle,
} from "lucide-react";

type Profissional = {
  id: string;
  nome: string;
};

type ComissaoRow = {
  id: string;
  id_salao: string;
  id_profissional: string | null;
  id_assistente?: string | null;
  id_comanda?: string | null;
  id_comanda_item?: string | null;
  tipo: string | null;
  descricao: string | null;
  competencia_data: string | null;
  valor_base: number | null;
  percentual_aplicado: number | null;
  origem_percentual: string | null;
  valor_comissao: number | null;
  valor_comissao_assistente: number | null;
  status: string | null;
  pago_em?: string | null;
  observacoes?: string | null;
  profissionais?: {
    nome: string;
  } | null;
};

type Resumo = {
  total: number;
  pendente: number;
  pago: number;
  cancelado: number;
};

type Permissoes = Record<string, boolean>;

function formatCurrency(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function statusLabel(status: string | null | undefined) {
  switch (status) {
    case "pendente":
      return "Pendente";
    case "pago":
      return "Pago";
    case "cancelado":
      return "Cancelado";
    default:
      return status || "-";
  }
}

function origemLabel(origem: string | null | undefined) {
  switch (origem) {
    case "profissional_servico":
      return "Exceção do profissional";
    case "servico_padrao":
      return "Padrão do serviço";
    case "profissional_padrao":
      return "Padrão antigo do profissional";
    case "assistente":
      return "Assistente";
    case "legado":
      return "Legado";
    case "manual":
      return "Lançamento manual";
    case "sem_regra":
      return "Sem regra definida";
    default:
      return origem || "-";
  }
}

export default function ComissoesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");

  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [nivel, setNivel] = useState("");
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [profissionalId, setProfissionalId] = useState("");
  const [dataInicial, setDataInicial] = useState(
    `${primeiroDiaMes.getFullYear()}-${String(primeiroDiaMes.getMonth() + 1).padStart(2, "0")}-${String(
      primeiroDiaMes.getDate()
    ).padStart(2, "0")}`
  );
  const [dataFinal, setDataFinal] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(
      hoje.getDate()
    ).padStart(2, "0")}`
  );

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [rows, setRows] = useState<ComissaoRow[]>([]);
  const [resumo, setResumo] = useState<Resumo>({
    total: 0,
    pendente: 0,
    pago: 0,
    cancelado: 0,
  });

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

    if (!permissoesFinal.comissoes_ver) {
      router.replace("/dashboard");
      return null;
    }

    return {
      idSalao: usuario.id_salao,
      nivel: String(usuario.nivel || "").toLowerCase(),
      permissoes: permissoesFinal,
    };
  }, [router, supabase]);

  const carregarComissoes = useCallback(
    async (salaoIdParam?: string) => {
      try {
        const salaoId = salaoIdParam || idSalao;
        if (!salaoId) return;

        setErro("");
        setMsg("");

        let query = supabase
          .from("comissoes_lancamentos")
          .select("*")
          .eq("id_salao", salaoId)
          .gte("competencia_data", dataInicial)
          .lte("competencia_data", dataFinal)
          .order("competencia_data", { ascending: false });

        if (status !== "todos") {
          query = query.eq("status", status);
        }

        if (profissionalId) {
          query = query.eq("id_profissional", profissionalId);
        }

        const { data, error } = await query;

        if (error) {
          console.error(error);
          setErro("Erro ao carregar comissões.");
          return;
        }

        const baseRows = (data as ComissaoRow[]) || [];

        const idsProfissionais = Array.from(
          new Set(baseRows.map((item) => item.id_profissional).filter(Boolean))
        ) as string[];

        let mapaProfissionais = new Map<string, { id: string; nome: string }>();

        if (idsProfissionais.length > 0) {
          const { data: profissionaisData, error: profError } = await supabase
            .from("profissionais")
            .select("id, nome")
            .in("id", idsProfissionais);

          if (profError) {
            console.error(profError);
            setErro("Erro ao carregar nomes dos profissionais.");
            return;
          }

          mapaProfissionais = new Map(
            (((profissionaisData as { id: string; nome: string }[]) || [])).map((item) => [
              item.id,
              item,
            ])
          );
        }

        const enriched = baseRows.map((item) => ({
          ...item,
          profissionais: item.id_profissional
            ? { nome: mapaProfissionais.get(item.id_profissional)?.nome || "Profissional" }
            : null,
        }));

        const filtradasBusca = enriched.filter((item) => {
          const termo = busca.trim().toLowerCase();
          if (!termo) return true;

          const profissional = item.profissionais?.nome?.toLowerCase() || "";
          const descricao = item.descricao?.toLowerCase() || "";
          const origem = origemLabel(item.origem_percentual).toLowerCase();

          return (
            profissional.includes(termo) ||
            descricao.includes(termo) ||
            origem.includes(termo)
          );
        });

        setRows(filtradasBusca);

        const novoResumo = filtradasBusca.reduce(
          (acc, item) => {
            const valor = Number(item.valor_comissao || 0);

            acc.total += valor;
            if (item.status === "pendente") acc.pendente += valor;
            if (item.status === "pago") acc.pago += valor;
            if (item.status === "cancelado") acc.cancelado += valor;

            return acc;
          },
          {
            total: 0,
            pendente: 0,
            pago: 0,
            cancelado: 0,
          }
        );

        setResumo(novoResumo);
      } catch (error: unknown) {
        console.error(error);
        setErro(error instanceof Error ? error.message : "Erro ao carregar comissões.");
      }
    },
    [supabase, idSalao, dataInicial, dataFinal, status, profissionalId, busca]
  );

  const init = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      const usuarioLogado = await getUsuarioLogado();
      const salaoIdFinal = usuarioLogado?.idSalao || acesso.idSalao;

      setIdSalao(salaoIdFinal);

      const { data: profissionaisData, error: profissionaisError } = await supabase
        .from("profissionais")
        .select("id, nome")
        .eq("id_salao", salaoIdFinal)
        .order("nome", { ascending: true });

      if (profissionaisError) {
        setErro("Erro ao carregar profissionais.");
        return;
      }

      setProfissionais((profissionaisData as Profissional[]) || []);
      await carregarComissoes(salaoIdFinal);
    } catch (error: unknown) {
      console.error(error);
      setErro(error instanceof Error ? error.message : "Erro ao carregar comissões.");
    } finally {
      setLoading(false);
    }
  }, [supabase, carregarComissoes, carregarAcesso]);

  useEffect(() => {
    void init();
  }, [init]);

  async function aplicarFiltros() {
    await carregarComissoes();
  }

  async function marcarComoPago(id: string) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para marcar comissão como paga.");
      return;
    }

    try {
      setSaving(true);
      setErro("");
      setMsg("");

      const { error } = await supabase
        .from("comissoes_lancamentos")
        .update({
          status: "pago",
          pago_em: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        throw new Error("Erro ao marcar comissão como paga.");
      }

      await carregarComissoes();
      setMsg("Comissão marcada como paga.");
    } catch (error: unknown) {
      console.error(error);
      setErro(error instanceof Error ? error.message : "Erro ao marcar como pago.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelarLancamento(id: string) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para cancelar lançamento.");
      return;
    }

    const confirmar = window.confirm("Deseja cancelar este lançamento de comissão?");
    if (!confirmar) return;

    try {
      setSaving(true);
      setErro("");
      setMsg("");

      const { error } = await supabase
        .from("comissoes_lancamentos")
        .update({
          status: "cancelado",
        })
        .eq("id", id);

      if (error) {
        throw new Error("Erro ao cancelar lançamento.");
      }

      await carregarComissoes();
      setMsg("Lançamento cancelado.");
    } catch (error: unknown) {
      console.error(error);
      setErro(error instanceof Error ? error.message : "Erro ao cancelar lançamento.");
    } finally {
      setSaving(false);
    }
  }

  async function marcarFiltradasComoPagas() {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para marcar rateio como pago.");
      return;
    }

    const ids = rows.filter((item) => item.status === "pendente").map((item) => item.id);

    if (ids.length === 0) {
      setErro("Não há comissões pendentes no filtro atual.");
      return;
    }

    const confirmar = window.confirm(
      `Deseja marcar ${ids.length} lançamento(s) filtrado(s) como pago(s)?`
    );
    if (!confirmar) return;

    try {
      setSaving(true);
      setErro("");
      setMsg("");

      const { error } = await supabase
        .from("comissoes_lancamentos")
        .update({
          status: "pago",
          pago_em: new Date().toISOString(),
        })
        .in("id", ids);

      if (error) {
        throw new Error("Erro ao marcar lançamentos como pagos.");
      }

      await carregarComissoes();
      setMsg("Rateio marcado como pago com sucesso.");
    } catch (error: unknown) {
      console.error(error);
      setErro(error instanceof Error ? error.message : "Erro ao marcar rateio como pago.");
    } finally {
      setSaving(false);
    }
  }

  function apurarRateio() {
    const pendentes = rows.filter((item) => item.status === "pendente");
    const total = pendentes.reduce((acc, item) => acc + Number(item.valor_comissao || 0), 0);

    if (pendentes.length === 0) {
      setErro("Não há lançamentos pendentes no filtro atual para apurar.");
      return;
    }

    setMsg(
      `Rateio apurado com ${pendentes.length} lançamento(s). Total pendente: ${formatCurrency(total)}.`
    );
  }

  function imprimirRateio() {
    const profissionalSelecionado =
      profissionais.find((p) => p.id === profissionalId)?.nome || "Todos";

    const html = `
      <html>
        <head>
          <title>Rateio de Comissões</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #111827;
            }
            h1, h2, h3, p {
              margin: 0 0 10px 0;
            }
            .topo {
              margin-bottom: 24px;
            }
            .resumo {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }
            .box {
              border: 1px solid #d4d4d8;
              border-radius: 12px;
              padding: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #d4d4d8;
              padding: 10px;
              text-align: left;
              font-size: 12px;
            }
            th {
              background: #f4f4f5;
            }
          </style>
        </head>
        <body>
          <div class="topo">
            <h1>Rateio de Comissões</h1>
            <p><strong>Profissional:</strong> ${profissionalSelecionado}</p>
            <p><strong>Período:</strong> ${formatDate(dataInicial)} até ${formatDate(dataFinal)}</p>
            <p><strong>Status:</strong> ${status === "todos" ? "Todos" : statusLabel(status)}</p>
            <p><strong>Emitido em:</strong> ${new Date().toLocaleString("pt-BR")}</p>
          </div>

          <div class="resumo">
            <div class="box">
              <strong>Total</strong>
              <div>${formatCurrency(resumo.total)}</div>
            </div>
            <div class="box">
              <strong>Pendente</strong>
              <div>${formatCurrency(resumo.pendente)}</div>
            </div>
            <div class="box">
              <strong>Pago</strong>
              <div>${formatCurrency(resumo.pago)}</div>
            </div>
            <div class="box">
              <strong>Cancelado</strong>
              <div>${formatCurrency(resumo.cancelado)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Profissional</th>
                <th>Descrição</th>
                <th>Competência</th>
                <th>Base</th>
                <th>% Aplicada</th>
                <th>Origem</th>
                <th>Comissão</th>
                <th>Status</th>
                <th>Pago em</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (item) => `
                <tr>
                  <td>${item.profissionais?.nome || "-"}</td>
                  <td>${item.descricao || "-"}</td>
                  <td>${formatDate(item.competencia_data)}</td>
                  <td>${formatCurrency(item.valor_base)}</td>
                  <td>${formatPercent(item.percentual_aplicado)}</td>
                  <td>${origemLabel(item.origem_percentual)}</td>
                  <td>${formatCurrency(item.valor_comissao)}</td>
                  <td>${statusLabel(item.status)}</td>
                  <td>${formatDateTime(item.pago_em)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  const totalPendentesCount = useMemo(
    () => rows.filter((item) => item.status === "pendente").length,
    [rows]
  );

  if (loading || !acessoCarregado) {
    return <div className="p-6">Carregando comissões...</div>;
  }

  if (permissoes && !permissoes.comissoes_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar Comissões.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <ResumoCard
            title="Total"
            value={formatCurrency(resumo.total)}
            icon={<BadgeDollarSign size={16} />}
          />
          <ResumoCard
            title="Pendente"
            value={formatCurrency(resumo.pendente)}
            icon={<CalendarDays size={16} />}
          />
          <ResumoCard
            title="Pago"
            value={formatCurrency(resumo.pago)}
            icon={<CheckCircle2 size={16} />}
          />
          <ResumoCard
            title="Cancelado"
            value={formatCurrency(resumo.cancelado)}
            icon={<XCircle size={16} />}
          />
        </div>

        <ComissaoHelpPanel
          eyebrow="Leitura rápida"
          title="Como este valor foi definido"
          description="A coluna de origem mostra qual regra entrou no lançamento. Isso ajuda a entender o que foi configurado e onde mexer para os próximos rateios."
          steps={[
            {
              title: "Padrão do serviço",
              description:
                "É a configuração principal do salão e deve ser o caminho mais comum para a comissão.",
            },
            {
              title: "Exceção do profissional",
              description:
                "Quando um profissional foge do padrão daquele serviço, a exceção aparece aqui.",
            },
            {
              title: "Taxa da maquininha",
              description:
                "Ela só entra na comissão se o salão permitir e o serviço ou vínculo estiver marcado para descontar taxa.",
            },
          ]}
        >
          <div className="flex flex-wrap gap-2 text-xs font-medium text-zinc-600">
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
              Exceção do profissional
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
              Padrão do serviço
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
              Padrão antigo do profissional
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
              Sem regra definida
            </span>
          </div>
        </ComissaoHelpPanel>

        {erro ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {erro}
          </div>
        ) : null}

        {msg ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {msg}
          </div>
        ) : null}

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_260px_260px_220px]">
            <Field>
              <Label>Buscar</Label>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por profissional ou descrição"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-11 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                />
              </div>
            </Field>

            <Field>
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </Field>

            <Field>
              <Label>Profissional</Label>
              <select
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
              >
                <option value="">Todos</option>
                {profissionais.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <Label>&nbsp;</Label>
              <button
                onClick={aplicarFiltros}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Aplicar filtros
              </button>
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_auto]">
            <Field>
              <Label>Data inicial</Label>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
              />
            </Field>

            <Field>
              <Label>Data final</Label>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
              />
            </Field>

            <div className="flex flex-wrap items-end gap-2">
              <button
                onClick={apurarRateio}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                Apurar rateio
              </button>

              <button
                onClick={imprimirRateio}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <Printer size={16} />
                Imprimir rateio
              </button>

              {podeGerenciar ? (
                <button
                  onClick={marcarFiltradasComoPagas}
                  disabled={saving || totalPendentesCount === 0}
                  className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                >
                  Marcar apurado como pago
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                  <th className="px-5 py-4">Profissional</th>
                  <th className="px-5 py-4">Descrição</th>
                  <th className="px-5 py-4">Competência</th>
                  <th className="px-5 py-4">Base</th>
                  <th className="px-5 py-4">% Aplicada</th>
                  <th className="px-5 py-4">Origem</th>
                  <th className="px-5 py-4">Comissão</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Pago em</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-sm text-zinc-500">
                      Nenhuma comissão encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  rows.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-100 align-top">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                            <User2 size={16} />
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">
                              {item.profissionais?.nome || "Profissional"}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {item.tipo === "assistente" ? "Assistente" : "Profissional"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-zinc-700">{item.descricao || "-"}</td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {formatDate(item.competencia_data)}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-zinc-800">
                        {formatCurrency(item.valor_base)}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-zinc-800">
                        {formatPercent(item.percentual_aplicado)}
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {origemLabel(item.origem_percentual)}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-zinc-900">
                        {formatCurrency(item.valor_comissao)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={item.status || ""} />
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {formatDateTime(item.pago_em)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {podeGerenciar ? (
                            <>
                              {item.status === "pendente" ? (
                                <button
                                  onClick={() => marcarComoPago(item.id)}
                                  disabled={saving}
                                  className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                                >
                                  Marcar como paga
                                </button>
                              ) : null}

                              {item.status !== "cancelado" ? (
                                <button
                                  onClick={() => cancelarLancamento(item.id)}
                                  disabled={saving}
                                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-xs font-medium text-zinc-400">
                              Somente leitura
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumoCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {title}
        </div>
        <div className="text-zinc-500">{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-bold text-zinc-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pago") {
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Pago
      </span>
    );
  }

  if (status === "cancelado") {
    return (
      <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
        Cancelado
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      Pendente
    </span>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-zinc-700">{children}</label>;
}
