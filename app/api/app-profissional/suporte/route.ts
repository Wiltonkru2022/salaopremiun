import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { requireProfissionalServerContext } from "@/lib/profissional-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buscarOuCriarConversaSuporte,
  listarMensagensConversa,
  salvarMensagemConversa,
} from "@/app/services/profissional/suporte";
import type {
  AgendamentoContexto,
  ClienteContexto,
  ComandaContexto,
  HistoricoMensagem,
  OpenAIMessage,
  ProfissionalContextoRow,
  StatusRow,
  SuporteRequestBody,
  TotalRow,
} from "@/types/profissional";

function parseUUID(value: unknown) {
  const parsed = String(value || "").trim();
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    !parsed ||
    parsed === "null" ||
    parsed === "undefined" ||
    !uuidRegex.test(parsed)
  ) {
    return null;
  }

  return parsed;
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY nao configurada.");
  }

  return new OpenAI({ apiKey });
}

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

function compactText(value: unknown, maxLength = 1200) {
  return String(value || "").trim().slice(0, maxLength);
}

function avaliarIntentPolicy(message: string) {
  const pedido = message.toLowerCase();
  const blockedIntents = [
    {
      intent: "criar_agendamento",
      patterns: [
        "cria agendamento",
        "criar agendamento",
        "agenda para mim",
        "agenda esse cliente",
        "faz o agendamento",
      ],
    },
    {
      intent: "cadastrar_cliente",
      patterns: ["cadastra cliente", "cadastrar cliente", "cria cliente"],
    },
    {
      intent: "alterar_senha",
      patterns: ["troca minha senha", "altera senha", "muda senha"],
    },
    {
      intent: "alterar_comanda",
      patterns: ["confirma o agendamento", "alterar comanda", "mudar comanda"],
    },
  ];

  return blockedIntents.find((entry) =>
    entry.patterns.some((pattern) => pedido.includes(pattern))
  );
}

function mapHistoricoToOpenAI(value: unknown): OpenAIMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => item as HistoricoMensagem)
    .filter((item) => typeof item?.conteudo === "string" && item.conteudo.trim())
    .map((item) => ({
      role: item.papel === "assistant" ? "assistant" : "user",
      content: compactText(item.conteudo, 700),
    }));
}

function parseSuporteRequestBody(input: unknown): SuporteRequestBody {
  if (!input || typeof input !== "object") {
    return {};
  }

  const body = input as Record<string, unknown>;

  return {
    message: typeof body.message === "string" ? body.message : undefined,
    origemPagina:
      typeof body.origemPagina === "string" ? body.origemPagina : null,
    idComanda: typeof body.idComanda === "string" ? body.idComanda : null,
    idAgendamento:
      typeof body.idAgendamento === "string" ? body.idAgendamento : null,
    idCliente: typeof body.idCliente === "string" ? body.idCliente : null,
  };
}

export async function POST(req: Request) {
  let idSalao = "";

  try {
    const body = parseSuporteRequestBody(await req.json().catch(() => null));

    const message = compactText(body?.message, 900);
    const origemPagina = String(body?.origemPagina || "").trim() || null;

    const idComanda = parseUUID(body?.idComanda);
    const idAgendamento = parseUUID(body?.idAgendamento);
    const idCliente = parseUUID(body?.idCliente);

    if (!message) {
      return NextResponse.json(
        { error: "Digite uma mensagem." },
        { status: 400 }
      );
    }

    const session = await requireProfissionalServerContext();
    idSalao = session.idSalao;

    const supabase = await createClient();

    const conversa = await buscarOuCriarConversaSuporte({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      origemPagina,
      idComanda,
      idAgendamento,
      idCliente,
    });

    await salvarMensagemConversa({
      idConversa: conversa.id,
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      papel: "user",
      conteudo: message,
    });

    const historico = await listarMensagensConversa(
      {
        idConversa: conversa.id,
        idSalao: session.idSalao,
        idProfissional: session.idProfissional,
      },
      20
    );

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
        .select(`
          id,
          nome,
          nome_exibicao,
          categoria,
          cargo,
          dias_trabalho,
          pausas,
          ativo
        `)
        .eq("id", session.idProfissional)
        .eq("id_salao", session.idSalao)
        .maybeSingle<ProfissionalContextoRow>(),

      supabase
        .from("agendamentos")
        .select(
          "id, data, hora_inicio, hora_fim, status, cliente_id, servico_id, id_comanda"
        )
        .eq("id_salao", session.idSalao)
        .eq("profissional_id", session.idProfissional)
        .eq("data", hojeISO())
        .order("hora_inicio", { ascending: true })
        .limit(10),

      supabase
        .from("comandas")
        .select("total, status, fechada_em")
        .eq("id_salao", session.idSalao)
        .gte("fechada_em", `${inicioSemanaISO()}T00:00:00`)
        .eq("status", "fechada"),

      supabase
        .from("comandas")
        .select("total, status, fechada_em")
        .eq("id_salao", session.idSalao)
        .gte("fechada_em", `${inicioMesISO()}T00:00:00`)
        .eq("status", "fechada"),

      supabase
        .from("comandas")
        .select("total, status, fechada_em")
        .eq("id_salao", session.idSalao)
        .gte("fechada_em", `${inicioAnoISO()}T00:00:00`)
        .eq("status", "fechada"),

      supabase
        .from("agendamentos")
        .select("status")
        .eq("id_salao", session.idSalao)
        .eq("profissional_id", session.idProfissional)
        .eq("data", hojeISO()),
    ]);

    const resumoFinanceiro = {
      faturamentoSemana: somarTotais(vendasSemanaResult.data),
      faturamentoMes: somarTotais(vendasMesResult.data),
      faturamentoAno: somarTotais(vendasAnoResult.data),
      statusAgendamentosHoje: contarPorStatus(statusAgendamentosResult.data),
    };

    let comandaAtual: ComandaContexto | null = null;
    let agendamentoAtual: AgendamentoContexto | null = null;
    let clienteAtual: ClienteContexto | null = null;

    if (idComanda) {
      const { data } = await supabase
        .from("comandas")
        .select(
          "id, numero, status, subtotal, desconto, acrescimo, total, id_cliente"
        )
        .eq("id", idComanda)
        .eq("id_salao", session.idSalao)
        .maybeSingle<ComandaContexto>();

      comandaAtual = data ?? null;

      if (comandaAtual?.id_cliente) {
        const { data: cliente } = await supabase
          .from("clientes")
          .select("id, nome, telefone, email")
          .eq("id", comandaAtual.id_cliente)
          .eq("id_salao", session.idSalao)
          .maybeSingle<ClienteContexto>();

        clienteAtual = cliente ?? null;
      }
    }

    if (idAgendamento) {
      const { data } = await supabase
        .from("agendamentos")
        .select(`
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
        `)
        .eq("id", idAgendamento)
        .eq("id_salao", session.idSalao)
        .eq("profissional_id", session.idProfissional)
        .maybeSingle<AgendamentoContexto>();

        agendamentoAtual = data ?? null;
    }

    if (idCliente && !clienteAtual) {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome, telefone, email")
        .eq("id", idCliente)
        .eq("id_salao", session.idSalao)
        .maybeSingle<ClienteContexto>();

      clienteAtual = data ?? null;
    }

    const intentBloqueada = avaliarIntentPolicy(message);

    if (intentBloqueada) {
      const respostaBloqueio =
        "Eu posso te orientar, mas nao executo acoes no sistema. No app profissional eu apenas ajudo com informacoes, regras e passo a passo de uso.";

      await salvarMensagemConversa({
        idConversa: conversa.id,
        idSalao: session.idSalao,
        idProfissional: session.idProfissional,
        papel: "assistant",
        conteudo: respostaBloqueio,
      });

      return NextResponse.json({
        answer: respostaBloqueio,
        conversaId: conversa.id,
        blockedIntent: intentBloqueada.intent,
      });
    }

    const historicoLimitado = historico.slice(-4);
    const historicoOpenAI = mapHistoricoToOpenAI(historicoLimitado);

    const contextoCompacto = {
      session: {
        idSalao: session.idSalao,
        idProfissional: session.idProfissional,
      },
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
      origemPagina,
      comandaAtual,
      agendamentoAtual,
      clienteAtual,
      resumoFinanceiro,
    };

    const systemPrompt = `
Voce e o assistente oficial do app profissional do SalaoPremium.

Seu papel:
- ajudar o profissional a entender e usar o app profissional
- responder em portugues do Brasil
- responder de forma humana, clara, curta e util
- se o profissional mudar de assunto, ignore o contexto anterior e responda apenas o novo assunto
- usar o contexto real do sistema quando ele existir

Voce NAO pode:
- criar agendamentos
- cadastrar clientes
- executar acoes no sistema
- trocar senha diretamente
- alterar comandas
- prometer funcoes que ainda nao existem

Regras obrigatorias:
- se perguntarem sobre trocar senha, explique o caminho correto no app ou informe que a alteracao e feita pelo sistema SaaS
- se perguntarem sobre cadastro, informe que o cadastro e feito somente pelo sistema SaaS
- se o profissional pedir suporte tecnico do sistema, explique que havera um chat exclusivo com o admin dono do sistema, mas que essa funcao ainda sera implantada
- voce pode informar status dos agendamentos
- voce pode informar faturamento da semana, do mes e do ano
- voce pode explicar telas, botoes, fluxos e regras do app profissional
- se a informacao nao existir no contexto atual, diga isso claramente
- resposta curta e direta
- nunca fique preso no assunto anterior se a nova pergunta for outra

Contexto real atual:
${JSON.stringify(
  {
    ...contextoCompacto,
  },
  null,
  2
)}
`;
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...historicoOpenAI.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
    });

    const answer = response.output_text || "Nao consegui responder agora.";

    await salvarMensagemConversa({
      idConversa: conversa.id,
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      papel: "assistant",
      conteudo: answer,
    });

    return NextResponse.json({
      answer,
      conversaId: conversa.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Sessao do profissional nao encontrada." },
        { status: 401 }
      );
    }

    if (idSalao) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `app-profissional:suporte:${idSalao}`,
          module: "app_profissional",
          title: "Suporte IA do app profissional falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro ao processar a mensagem no suporte.",
          severity: "alta",
          idSalao,
          details: {
            route: "/api/app-profissional/suporte",
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente do suporte IA do app profissional:",
          incidentError
        );
      }
    }

    console.error("Erro no suporte IA:", error);

    return NextResponse.json(
      { error: "Erro ao processar a mensagem no suporte." },
      { status: 500 }
    );
  }
}
