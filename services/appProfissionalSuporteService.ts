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
      return salvarMensagemConversa(params);
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
            `
              id,
              nome,
              nome_exibicao,
              categoria,
              cargo,
              dias_trabalho,
              pausas,
              ativo
            `
          )
          .eq("id", params.idProfissional)
          .eq("id_salao", params.idSalao)
          .maybeSingle<ProfissionalContextoRow>(),

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
            .select(
              "id, numero, status, subtotal, desconto, acrescimo, total, id_cliente"
            )
            .eq("id", params.contexto.idComanda)
            .eq("id_salao", params.idSalao)
            .maybeSingle<ComandaContexto>();

          comandaAtual = data ?? null;
        }

        if (comandaAtual?.id_cliente) {
          const { data: cliente } = await supabase
            .from("clientes")
            .select("id, nome, telefone, email")
            .eq("id", comandaAtual.id_cliente)
            .eq("id_salao", params.idSalao)
            .maybeSingle<ClienteContexto>();

          clienteAtual = cliente ?? null;
        }
      }

      if (params.contexto.idAgendamento) {
        const { data } = await supabase
          .from("agendamentos")
          .select(
            `
              id,
              data,
              hora_inicio,
              hora_fim,
              status,
              cliente_id,
              servico_id,
              id_comanda,
              observacoes,
              duracao_minutos
            `
          )
          .eq("id", params.contexto.idAgendamento)
          .eq("id_salao", params.idSalao)
          .eq("profissional_id", params.idProfissional)
          .maybeSingle<AgendamentoContexto>();

        agendamentoAtual = data ?? null;
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
            .select("id, nome, telefone, email")
            .eq("id", params.contexto.idCliente)
            .eq("id_salao", params.idSalao)
            .maybeSingle<ClienteContexto>();

          clienteAtual = data ?? null;
        }
      }

      return {
        profissional: profissionalResult.data
          ? {
              nome:
                profissionalResult.data.nome_exibicao ||
                profissionalResult.data.nome,
              categoria: profissionalResult.data.categoria,
              cargo: profissionalResult.data.cargo,
              ativo: profissionalResult.data.ativo,
            }
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
      };
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
            content: params.systemPrompt,
          },
          ...params.historico.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        ],
      });

      return response.output_text || "Nao consegui responder agora.";
    },
  };
}

export type AppProfissionalSuporteService = ReturnType<
  typeof createAppProfissionalSuporteService
>;
