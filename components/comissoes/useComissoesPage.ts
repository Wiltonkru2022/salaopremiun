"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import {
  getStatusComissaoMeta,
  getStatusComissaoQueryValues,
  normalizeStatusComissao,
} from "@/lib/domain/status";
import type {
  ComissaoConfirmacao,
  ComissaoPermissoes,
  ComissaoProfissional,
  ComissaoResumo,
  ComissaoRow,
} from "@/components/comissoes/types";

function getTipoDestinatario(item: ComissaoRow) {
  return String(item.tipo_destinatario || item.tipo || "").toLowerCase() ===
    "assistente"
    ? "assistente"
    : "profissional";
}

function getValorLancamento(item: ComissaoRow) {
  if (getTipoDestinatario(item) === "assistente") {
    return Number(item.valor_comissao_assistente ?? item.valor_comissao ?? 0);
  }
  return Number(item.valor_comissao || 0);
}

function formatCurrency(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function origemMetaLabel(origem: string | null | undefined) {
  if (origem === "profissional_servico") return "excecao do profissional";
  if (origem === "servico_padrao") return "padrao do servico";
  if (origem === "profissional_padrao") return "padrao antigo do profissional";
  if (origem === "assistente") return "assistente";
  if (origem === "manual") return "lancamento manual";
  return "sem regra definida";
}

export function useComissoesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [permissoes, setPermissoes] = useState<ComissaoPermissoes | null>(null);
  const [nivel, setNivel] = useState("");
  const [acessoCarregado, setAcessoCarregado] = useState(false);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [tipoDestinatario, setTipoDestinatario] = useState("todos");
  const [profissionalId, setProfissionalId] = useState("");
  const [dataInicial, setDataInicial] = useState(
    `${primeiroDiaMes.getFullYear()}-${String(
      primeiroDiaMes.getMonth() + 1
    ).padStart(2, "0")}-${String(primeiroDiaMes.getDate()).padStart(2, "0")}`
  );
  const [dataFinal, setDataFinal] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(hoje.getDate()).padStart(2, "0")}`
  );
  const [profissionais, setProfissionais] = useState<ComissaoProfissional[]>([]);
  const [rows, setRows] = useState<ComissaoRow[]>([]);
  const [resumo, setResumo] = useState<ComissaoResumo>({
    total: 0,
    pendente: 0,
    pago: 0,
    cancelado: 0,
  });
  const [confirmacaoComissao, setConfirmacaoComissao] =
    useState<ComissaoConfirmacao | null>(null);

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
      setErro("Nao foi possivel validar o usuario do sistema.");
      return null;
    }

    const { data: permissoesDb } = await supabase
      .from("usuarios_permissoes")
      .select("*")
      .eq("id_usuario", usuario.id)
      .eq("id_salao", usuario.id_salao)
      .maybeSingle();

    const permissoesFinal: ComissaoPermissoes = {
      ...buildPermissoesByNivel(usuario.nivel),
      ...sanitizePermissoesDb(permissoesDb as Record<string, unknown> | null),
    };

    setPermissoes(permissoesFinal);
    setNivel(String(usuario.nivel || "").toLowerCase());
    setIdSalao(usuario.id_salao);
    setAcessoCarregado(true);

    if (!permissoesFinal.comissoes_ver) {
      router.replace("/dashboard");
      return null;
    }

    return { idSalao: usuario.id_salao };
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
          .order("criado_em", { ascending: false })
          .order("competencia_data", { ascending: false });

        if (status !== "todos") {
          query = query.in("status", getStatusComissaoQueryValues(status));
        }
        if (tipoDestinatario !== "todos") {
          query = query.eq("tipo_destinatario", tipoDestinatario);
        }
        if (profissionalId) query = query.eq("id_profissional", profissionalId);

        const { data, error } = await query;
        if (error) throw error;

        const baseRows = (data as ComissaoRow[]) || [];
        const idsProfissionais = Array.from(
          new Set(
            baseRows.map((item) => item.id_profissional).filter(Boolean)
          )
        ) as string[];

        let mapaProfissionais = new Map<string, { id: string; nome: string }>();

        if (idsProfissionais.length > 0) {
          const { data: profissionaisData, error: profError } = await supabase
            .from("profissionais")
            .select("id, nome")
            .in("id", idsProfissionais);
          if (profError) throw profError;
          mapaProfissionais = new Map(
            (((profissionaisData as { id: string; nome: string }[]) || []).map(
              (item) => [item.id, item]
            ))
          );
        }

        const termo = busca.trim().toLowerCase();
        const enriched = baseRows
          .map((item) => ({
            ...item,
            status: normalizeStatusComissao(item.status),
            profissionais: item.id_profissional
              ? {
                  nome:
                    mapaProfissionais.get(item.id_profissional)?.nome ||
                    "Profissional",
                }
              : null,
          }))
          .filter((item) => {
            if (!termo) return true;
            const profissional = item.profissionais?.nome?.toLowerCase() || "";
            const descricao = item.descricao?.toLowerCase() || "";
            return (
              profissional.includes(termo) ||
              descricao.includes(termo) ||
              origemMetaLabel(item.origem_percentual).includes(termo)
            );
          });

        setRows(enriched);
        setResumo(
          enriched.reduce(
            (acc, item) => {
              const valor = getValorLancamento(item);
              acc.total += valor;
              const statusNormalizado = normalizeStatusComissao(item.status);
              if (statusNormalizado === "pendente") acc.pendente += valor;
              if (statusNormalizado === "pago") acc.pago += valor;
              if (statusNormalizado === "cancelado") acc.cancelado += valor;
              return acc;
            },
            { total: 0, pendente: 0, pago: 0, cancelado: 0 }
          )
        );
      } catch (error) {
        console.error(error);
        setErro(
          error instanceof Error ? error.message : "Erro ao carregar comissoes."
        );
      }
    },
    [
      busca,
      dataFinal,
      dataInicial,
      idSalao,
      profissionalId,
      status,
      supabase,
      tipoDestinatario,
    ]
  );

  const init = useCallback(async () => {
    try {
      setLoading(true);
      const acesso = await carregarAcesso();
      if (!acesso) return;

      const usuarioLogado = await getUsuarioLogado();
      const salaoIdFinal = usuarioLogado?.idSalao || acesso.idSalao;
      setIdSalao(salaoIdFinal);

      const { data: profissionaisData, error: profissionaisError } =
        await supabase
          .from("profissionais")
          .select("id, nome")
          .eq("id_salao", salaoIdFinal)
          .order("nome");
      if (profissionaisError) throw profissionaisError;

      setProfissionais((profissionaisData as ComissaoProfissional[]) || []);
      await carregarComissoes(salaoIdFinal);
    } catch (error) {
      console.error(error);
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar comissoes."
      );
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, carregarComissoes, supabase]);

  useEffect(() => {
    void init();
  }, [init]);

  const processarComissoes = useCallback(
    async (acao: "marcar_pago" | "cancelar", ids: string[]) => {
      const response = await fetch("/api/comissoes/processar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idSalao,
          ids,
          acao,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Erro ao processar lancamentos de comissao."
        );
      }

      return {
        totalLancamentos: Number(result?.totalLancamentos || 0),
        totalVales: Number(result?.totalVales || 0),
        totalProfissionaisComVales: Number(
          result?.totalProfissionaisComVales || 0
        ),
      };
    },
    [idSalao]
  );

  const marcarComoPago = useCallback(
    async (id: string) => {
      if (!podeGerenciar) {
        setErro("Voce nao tem permissao para marcar como pago.");
        return;
      }

      try {
        setSaving(true);
        const resultado = await processarComissoes("marcar_pago", [id]);
        await carregarComissoes();
        setMsg(
          resultado.totalLancamentos === 0
            ? "Nenhuma comissao pendente foi alterada."
            : resultado.totalVales > 0
              ? `Comissao marcada como paga. Vales descontados: ${formatCurrency(resultado.totalVales)}.`
              : "Comissao marcada como paga."
        );
      } catch (error) {
        console.error(error);
        setErro(
          error instanceof Error ? error.message : "Erro ao marcar como pago."
        );
      } finally {
        setSaving(false);
      }
    },
    [carregarComissoes, podeGerenciar, processarComissoes]
  );

  const cancelarLancamento = useCallback(
    async (id: string) => {
      if (!podeGerenciar) {
        setErro("Voce nao tem permissao para cancelar lancamento.");
        return;
      }

      try {
        setSaving(true);
        const resultado = await processarComissoes("cancelar", [id]);
        await carregarComissoes();
        setMsg(
          resultado.totalLancamentos === 0
            ? "Nenhum lancamento elegivel foi cancelado."
            : "Lancamento cancelado."
        );
      } catch (error) {
        console.error(error);
        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao cancelar lancamento."
        );
      } finally {
        setSaving(false);
      }
    },
    [carregarComissoes, podeGerenciar, processarComissoes]
  );

  const marcarFiltradasComoPagas = useCallback(() => {
    const pendentes = rows.filter(
      (item) => normalizeStatusComissao(item.status) === "pendente"
    );
    const ids = pendentes.map((item) => item.id);

    if (!podeGerenciar) {
      setErro("Voce nao tem permissao para marcar rateio como pago.");
      return;
    }

    if (ids.length === 0) {
      setErro("Nao ha comissoes pendentes no filtro atual.");
      return;
    }

    setConfirmacaoComissao({ acao: "marcar_pago", ids });
  }, [podeGerenciar, rows]);

  const apurarRateio = useCallback(() => {
    const pendentes = rows.filter(
      (item) => normalizeStatusComissao(item.status) === "pendente"
    );
    const total = pendentes.reduce(
      (acc, item) => acc + getValorLancamento(item),
      0
    );

    if (pendentes.length === 0) {
      setErro("Nao ha lancamentos pendentes no filtro atual para apurar.");
      return;
    }

    setMsg(
      `Rateio apurado com ${pendentes.length} lancamento(s). Total pendente: ${formatCurrency(total)}.`
    );
  }, [rows]);

  const confirmarAcao = useCallback(async () => {
    const confirmacao = confirmacaoComissao;
    setConfirmacaoComissao(null);
    if (!confirmacao) return;

    if (confirmacao.acao === "cancelar") {
      await cancelarLancamento(confirmacao.ids[0]);
      return;
    }

    try {
      setSaving(true);
      const resultado = await processarComissoes(
        "marcar_pago",
        confirmacao.ids
      );
      await carregarComissoes();
      setMsg(
        resultado.totalLancamentos === 0
          ? "Nenhuma comissao pendente foi alterada."
          : resultado.totalVales > 0
            ? `Rateio marcado como pago. Vales descontados: ${formatCurrency(resultado.totalVales)}.`
            : "Rateio marcado como pago."
      );
    } catch (error) {
      console.error(error);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao marcar rateio como pago."
      );
    } finally {
      setSaving(false);
    }
  }, [
    cancelarLancamento,
    carregarComissoes,
    confirmacaoComissao,
    processarComissoes,
  ]);

  const totalPendentesCount = useMemo(
    () =>
      rows.filter(
        (item) => normalizeStatusComissao(item.status) === "pendente"
      ).length,
    [rows]
  );

  const ticketMedio = useMemo(
    () => (rows.length ? resumo.total / rows.length : 0),
    [resumo.total, rows.length]
  );

  const maiorLancamento = useMemo(
    () =>
      rows.reduce<ComissaoRow | null>(
        (maior, item) =>
          !maior || getValorLancamento(item) > getValorLancamento(maior)
            ? item
            : maior,
        null
      ),
    [rows]
  );

  const resumoPorTipo = useMemo(
    () =>
      rows.reduce(
        (acc, item) => {
          const valor = getValorLancamento(item);
          if (getTipoDestinatario(item) === "assistente") {
            acc.assistente += valor;
          } else {
            acc.profissional += valor;
          }
          return acc;
        },
        { profissional: 0, assistente: 0 }
      ),
    [rows]
  );

  const resumoProfissionais = useMemo(() => {
    const mapa = new Map<
      string,
      {
        id: string;
        nome: string;
        total: number;
        pendente: number;
        quantidade: number;
        statusPredominante: string;
        statusMap: Record<string, number>;
      }
    >();

    rows.forEach((item) => {
      const id = item.id_profissional || item.profissionais?.nome || item.id;
      const nome = item.profissionais?.nome || "Profissional";
      const valor = getValorLancamento(item);
      if (!mapa.has(id)) {
        mapa.set(id, {
          id,
          nome,
          quantidade: 0,
          pendente: 0,
          statusMap: {},
          statusPredominante: "pendente",
          total: 0,
        });
      }
      const atual = mapa.get(id)!;
      atual.quantidade += 1;
      atual.total += valor;
      const statusNormalizado = normalizeStatusComissao(item.status);
      if (statusNormalizado === "pendente") atual.pendente += valor;
      atual.statusMap[statusNormalizado] =
        (atual.statusMap[statusNormalizado] || 0) + 1;
    });

    return Array.from(mapa.values())
      .map((item) => ({
        ...item,
        statusPredominante:
          Object.entries(item.statusMap).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          "pendente",
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  return {
    loading,
    saving,
    erro,
    msg,
    permissoes,
    acessoCarregado,
    podeGerenciar,
    busca,
    setBusca,
    status,
    setStatus,
    tipoDestinatario,
    setTipoDestinatario,
    profissionalId,
    setProfissionalId,
    dataInicial,
    setDataInicial,
    dataFinal,
    setDataFinal,
    profissionais,
    rows,
    resumo,
    confirmacaoComissao,
    setConfirmacaoComissao,
    carregarComissoes,
    marcarComoPago,
    marcarFiltradasComoPagas,
    apurarRateio,
    confirmarAcao,
    totalPendentesCount,
    ticketMedio,
    maiorLancamento,
    resumoPorTipo,
    resumoProfissionais,
    getTipoDestinatario,
    getValorLancamento,
    getStatusComissaoMeta,
    normalizeStatusComissao,
  };
}
