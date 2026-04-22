import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { requireProfissionalServerContext } from "@/lib/profissional-context.server";
import {
  buscarOuCriarConversaSuporte,
  listarMensagensConversa,
  excluirConversaSuporte,
  salvarMensagemConversa,
} from "@/app/services/profissional/suporte";
import type {
  AgendamentoContexto,
  ClienteContexto,
  ComandaContexto,
  ProfissionalContextoRow,
  StatusRow,
  TotalRow,
} from "@/types/profissional";
import {
  buildSafeClienteContext,
  buildSafePromptJson,
  firstNameOnly,
  sanitizeFreeText,
} from "@/lib/security/pii";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function inicioSemanaISO() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  now.setDate(now.getDate() - diff);
  return now.toISOString().slice(0, 10);
}

function inicioMesISO() {
  const now = new Date();
  now.setDate(1);
  return now.toISOString().slice(0, 10);
}

function inicioAnoISO() {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

function somarTotais(rows: TotalRow[] | null | undefined) {
  return Number(
    (rows ?? [])
      .reduce((acc, item) => acc + Number(item.total || 0), 0)
      .toFixed(2)
  );
}

function contarPorStatus(rows: StatusRow[] | null | undefined) {
  const mapa: Record<string, number> = {};
  for (const item of rows ?? []) {
    const status = String(item.status || "sem_status").toLowerCase();
    mapa[status] = (mapa[status] || 0) + 1;
  }
  return mapa;
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY nao configurada.");
  }
  return new OpenAI({ apiKey });
}

async function profissionalTemAcessoComanda(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  idSalao: string;
  idProfissional: string;
  idComanda: string;
}) {
  const { data, error } = await params.supabase
    .from("comanda_itens")
    .select("id")
    .eq("id_salao", params.idSalao)
    .eq("id_comanda", params.idComanda)
    .or(
      `id_profissional.eq.${params.idProfissional},id_assistente.eq.${params.idProfissional}`
    )
    .limit(1);
  if (error) {
    console.error("Erro ao validar acesso do profissional a comanda:", error);
    return false;
  }
  return Boolean(data?.length);
}

async function profissionalTemAcessoCliente(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  idSalao: string;
  idProfissional: string;
  idCliente: string;
}) {
  const { data, error } = await params.supabase
    .from("agendamentos")
    .select("id")
    .eq("id_salao", params.idSalao)
    .eq("profissional_id", params.idProfissional)
    .eq("cliente_id", params.idCliente)
    .limit(1);
  if (error) {
    console.error("Erro ao validar acesso do profissional a cliente:", error);
    return false;
  }
  return Boolean(data?.length);
}

function buildSafeComandaContext(
  comanda:
    | {
        id?: string | null;
        numero?: string | number | null;
        status?: string | null;
        subtotal?: number | null;
        desconto?: number | null;
        acrescimo?: number | null;
        total?: number | null;
        id_cliente?: string | null;
      }
    | null
): ComandaContexto | null {
  if (!comanda?.id) return null;
  return {
    id: comanda.id,
    numero: comanda.numero ?? null,
    status: sanitizeFreeText(comanda.status, 40) || null,
    subtotal: Number(comanda.subtotal || 0),
    desconto: Number(comanda.desconto || 0),
    acrescimo: Number(comanda.acrescimo || 0),
    total: Number(comanda.total || 0),
    id_cliente: comanda.id_cliente ?? null,
  } as ComandaContexto;
}

function buildSafeAgendamentoContext(
  agendamento:
    | {
        id?: string | null;
        data?: string | null;
        hora_inicio?: string | null;
        hora_fim?: string | null;
        status?: string | null;
        cliente_id?: string | null;
        servico_id?: string | null;
        id_comanda?: string | null;
        observacoes?: string | null;
        duracao_minutos?: number | null;
      }
    | null
): AgendamentoContexto | null {
  if (!agendamento?.id) return null;
  return {
    id: agendamento.id,
    data: agendamento.data ?? null,
    hora_inicio: agendamento.hora_inicio ?? null,
    hora_fim: agendamento.hora_fim ?? null,
    status: sanitizeFreeText(agendamento.status, 40) || null,
    cliente_id: agendamento.cliente_id ?? null,
    servico_id: agendamento.servico_id ?? null,
    id_comanda: agendamento.id_comanda ?? null,
    observacoes: sanitizeFreeText(agendamento.observacoes, 160) || null,
    duracao_minutos: Number(agendamento.duracao_minutos || 0) || null,
  } as AgendamentoContexto;
}

function buildSafeOperationalContext(contexto: {
  profissional: ProfissionalContextoRow | null;
  agendaHoje: Array<{
    id?: string | null;
    data?: string | null;
    hora_inicio?: string | null;
    hora_fim?: string | null;
    status?: string | null;
    cliente_id?: string | null;
    servico_id?: string | null;
    id_comanda?: string | null;
  }>;
  origemPagina: string | null;
  comandaAtual: ComandaContexto | null;
  agendamentoAtual: AgendamentoContexto | null;
  clienteAtual: ClienteContexto | null;
  resumoFinanceiro: {
    faturamentoSemana: number;
    faturamentoMes: number;
    faturamentoAno: number;
    statusAgendamentosHoje: Record<string, number>;
  };
}) {
  return {
    profissional: contexto.profissional
      ? {
          nome: firstNameOnly(
            contexto.profissional.nome_exibicao || contexto.profissional.nome
          ),
          categoria: sanitizeFreeText(contexto.profissional.categoria, 60) || null,
          cargo: sanitizeFreeText(contexto.profissional.cargo, 60) || null,
          ativo: Boolean(contexto.profissional.ativo),
        }
      : null,
    agendaHoje: (contexto.agendaHoje || []).slice(0, 6).map((item) => ({
      id: item.id ?? null,
      data: item.data ?? null,
      hora_inicio: item.hora_inicio ?? null,
      hora_fim: item.hora_fim ?? null,
      status: sanitizeFreeText(item.status, 40) || null,
      cliente_id: item.cliente_id ?? null,
      servico_id: item.servico_id ?? null,
      id_comanda: item.id_comanda ?? null,
    })),
    origemPagina: sanitizeFreeText(contexto.origemPagina, 80) || null,
    comandaAtual: contexto.comandaAtual,
    agendamentoAtual: contexto.agendamentoAtual,
    clienteAtual: contexto.clienteAtual,
    resumoFinanceiro: {
      faturamentoSemana: Number(contexto.resumoFinanceiro.faturamentoSemana || 0),
      faturamentoMes: Number(contexto.resumoFinanceiro.faturamentoMes || 0),
      faturamentoAno: Number(contexto.resumoFinanceiro.faturamentoAno || 0),
      statusAgendamentosHoje: contexto.resumoFinanceiro.statusAgendamentosHoje || {},
    },
  };
}

export type AppProfissionalSuporteContexto = {
  origemPagina: string | null;
  idComanda: string | null;
  idAgendamento: string | null;
  idCliente: string | null;
};

export function createAppProfissionalSuporteService() {
  return {
    requireSession() {
      return requireProfissionalServerContext();
    },
    buscarOuCriarConversa(params: {
      idSalao: string;
      idProfissional: string;
      contexto: AppProfissionalSuporteContexto;
    }) {
      return buscarOuCriarConversaSuporte({
        idSalao: params.idSalao,
        idProfissional: params.idProfissional,
        origemPagina: params.contexto.origemPagina,
        idComanda: params.contexto.idComanda,
        idAgendamento: params.contexto.idAgendamento,
        idCliente: params.contexto.idCliente,
      });
    },
    salvarMensagem(params: {
      idConversa: string;
      idSalao: string;
      idProfissional: string;
      papel: "user" | "assistant" | "system";
      conteudo: string;
    }) {
      return salvarMensagemConversa({
        ...params,
        conteudo: sanitizeFreeText(params.conteudo, 3000),
      });
    },
    listarHistorico(params: {
      idConversa: string;
      idSalao: string;
      idProfissional: string;
      limite?: number;
    }) {
      return listarMensagensConversa(
        {
          idConversa: params.idConversa,
          idSalao: params.idSalao,
          idProfissional: params.idProfissional,
        },
        params.limite || 20
      );
    },
    excluirConversa(params: {
      idConversa: string;
      idSalao: string;
      idProfissional: string;
    }) {
      return excluirConversaSuporte(params);
    },
    async carregarContextoOperacional(params: {
      idSalao: string;
      idProfissional: string;
      contexto: AppProfissionalSuporteContexto;
    }) {
      const supabase = await createClient();
      const [
        profissionalResult,
        agendaHojeResult,
        vendasSemanaResult,
        vendasMesResult,
        vendasAnoResult,
        statusAgendamentosResult,
      ] = await Promise.all([
        supabase
          .from("profissionais")
          .select(
            "id, nome, nome_exibicao, categoria, cargo, dias_trabalho, pausas, ativo"
          )
          .eq("id", params.idProfissional)
          .eq("id_salao", params.idSalao)
          .maybeSingle(),
        supabase
          .from("agendamentos")
          .select(
            "id, data, hora_inicio, hora_fim, status, cliente_id, servico_id, id_comanda"
          )
          .eq("id_salao", params.idSalao)
          .eq("profissional_id", params.idProfissional)
          .eq("data", hojeISO())
          .order("hora_inicio", { ascending: true })
          .limit(10),
        supabase
          .from("comandas")
          .select("total, status, fechada_em")
          .eq("id_salao", params.idSalao)
          .gte("fechada_em", `${inicioSemanaISO()}T00:00:00`)
          .eq("status", "fechada"),
        supabase
          .from("comandas")
          .select("total, status, fechada_em")
          .eq("id_salao", params.idSalao)
          .gte("fechada_em", `${inicioMesISO()}T00:00:00`)
          .eq("status", "fechada"),
        supabase
          .from("comandas")
          .select("total, status, fechada_em")
          .eq("id_salao", params.idSalao)
          .gte("fechada_em", `${inicioAnoISO()}T00:00:00`)
          .eq("status", "fechada"),
        supabase
          .from("agendamentos")
          .select("status")
          .eq("id_salao", params.idSalao)
          .eq("profissional_id", params.idProfissional)
          .eq("data", hojeISO()),
      ]);

      let comandaAtual: ComandaContexto | null = null;
      let agendamentoAtual: AgendamentoContexto | null = null;
      let clienteAtual: ClienteContexto | null = null;

      if (params.contexto.idComanda) {
        const podeVerComanda = await profissionalTemAcessoComanda({
          supabase,
          idSalao: params.idSalao,
          idProfissional: params.idProfissional,
          idComanda: params.contexto.idComanda,
        });
        if (podeVerComanda) {
          const { data } = await supabase
            .from("comandas")
            .select("id, numero, status, subtotal, desconto, acrescimo, total, id_cliente")
            .eq("id", params.contexto.idComanda)
            .eq("id_salao", params.idSalao)
            .maybeSingle();
          comandaAtual = buildSafeComandaContext(data ?? null);
        }
        if (comandaAtual?.id_cliente) {
          const { data: cliente } = await supabase
            .from("clientes")
            .select("id, nome")
            .eq("id", comandaAtual.id_cliente)
            .eq("id_salao", params.idSalao)
            .maybeSingle();
          clienteAtual =
            (buildSafeClienteContext(cliente ?? null) as ClienteContexto | null) ?? null;
        }
      }

      if (params.contexto.idAgendamento) {
        const { data } = await supabase
          .from("agendamentos")
          .select(
            "id, data, hora_inicio, hora_fim, status, cliente_id, servico_id, id_comanda, observacoes, duracao_minutos"
          )
          .eq("id", params.contexto.idAgendamento)
          .eq("id_salao", params.idSalao)
          .eq("profissional_id", params.idProfissional)
          .maybeSingle();
        agendamentoAtual = buildSafeAgendamentoContext(data ?? null);
      }

      if (params.contexto.idCliente && !clienteAtual) {
        const podeVerCliente = await profissionalTemAcessoCliente({
          supabase,
          idSalao: params.idSalao,
          idProfissional: params.idProfissional,
          idCliente: params.contexto.idCliente,
        });
        if (podeVerCliente) {
          const { data } = await supabase
            .from("clientes")
            .select("id, nome")
            .eq("id", params.contexto.idCliente)
            .eq("id_salao", params.idSalao)
            .maybeSingle();
          clienteAtual =
            (buildSafeClienteContext(data ?? null) as ClienteContexto | null) ?? null;
        }
      }

      return buildSafeOperationalContext({
        profissional: profissionalResult.data
          ? ({
              nome: profissionalResult.data.nome,
              nome_exibicao: profissionalResult.data.nome_exibicao,
              categoria: profissionalResult.data.categoria,
              cargo: profissionalResult.data.cargo,
              ativo: profissionalResult.data.ativo,
            } as ProfissionalContextoRow)
          : null,
        agendaHoje: (agendaHojeResult.data || []).slice(0, 6),
        origemPagina: params.contexto.origemPagina,
        comandaAtual,
        agendamentoAtual,
        clienteAtual,
        resumoFinanceiro: {
          faturamentoSemana: somarTotais(vendasSemanaResult.data),
          faturamentoMes: somarTotais(vendasMesResult.data),
          faturamentoAno: somarTotais(vendasAnoResult.data),
          statusAgendamentosHoje: contarPorStatus(statusAgendamentosResult.data),
        },
      });
    },
    buildSystemPrompt(params: {
      contextoOperacional: unknown;
    }) {
      return [
        "Voce e o assistente interno do Salao Premium no app profissional.",
        "Objetivo: ajudar com uso do sistema, agenda, comandas e contexto operacional do profissional.",
        "Regras obrigatorias:",
        "- Nunca exponha email, telefone, CPF ou outro dado pessoal sensivel.",
        "- Nunca invente dados ausentes.",
        "- Se faltar informacao, diga claramente que nao encontrou.",
        "- Responda de forma objetiva e operacional.",
        "- Se a pergunta pedir dados pessoais de cliente, recuse e oriente o usuario a consultar a tela autorizada do sistema.",
        "",
        "Contexto operacional seguro:",
        buildSafePromptJson(params.contextoOperacional),
      ].join("\n");
    },
    async gerarRespostaIA(params: {
      systemPrompt: string;
      historico: Array<{ role: "user" | "assistant"; content: string }>;
    }) {
      const openai = getOpenAI();
      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: sanitizeFreeText(params.systemPrompt, 12000),
          },
          ...params.historico.map((msg) => ({
            role: msg.role,
            content: sanitizeFreeText(msg.content, 3000),
          })),
        ],
      });
      return sanitizeFreeText(
        response.output_text || "Nao consegui responder agora.",
        4000
      );
    },
  };
}

export type AppProfissionalSuporteService = ReturnType<
  typeof createAppProfissionalSuporteService
>;
