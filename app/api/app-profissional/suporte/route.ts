import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import {
  buscarOuCriarConversaSuporte,
  listarMensagensConversa,
  salvarMensagemConversa,
} from "@/app/services/profissional/suporte";

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
    throw new Error("OPENAI_API_KEY não configurada.");
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

type TotalRow = {
  total?: number | string | null;
};

type StatusRow = {
  status?: string | null;
};

type ComandaContexto = {
  id: string;
  numero?: number | string | null;
  status?: string | null;
  subtotal?: number | string | null;
  desconto?: number | string | null;
  acrescimo?: number | string | null;
  total?: number | string | null;
  id_cliente?: string | null;
};

type AgendamentoContexto = {
  id: string;
  data?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  status?: string | null;
  cliente_id?: string | null;
  servico_id?: string | null;
  id_comanda?: string | null;
  observacoes?: string | null;
  duracao_minutos?: number | null;
};

type ClienteContexto = {
  id: string;
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
};

type HistoricoMensagem = {
  papel?: string | null;
  conteudo?: string | null;
};

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type SuporteRequestBody = {
  message?: string;
  origemPagina?: string | null;
  idComanda?: string | null;
  idAgendamento?: string | null;
  idCliente?: string | null;
};

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SuporteRequestBody;

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

    const session = await getProfissionalSessionFromCookie();

    if (!session) {
      return NextResponse.json(
        { error: "Sessão do profissional não encontrada." },
        { status: 401 }
      );
    }

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
        .maybeSingle(),

      supabase
        .from("agendamentos")
        .select("id, data, hora_inicio, hora_fim, status, cliente_id, servico_id, id_comanda")
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
        .select("id, numero, status, subtotal, desconto, acrescimo, total, id_cliente")
        .eq("id", idComanda)
        .eq("id_salao", session.idSalao)
        .maybeSingle();

      comandaAtual = data ?? null;

      if (comandaAtual?.id_cliente) {
        const { data: cliente } = await supabase
          .from("clientes")
          .select("id, nome, telefone, email")
          .eq("id", comandaAtual.id_cliente)
          .eq("id_salao", session.idSalao)
          .maybeSingle();

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
        .maybeSingle();

      agendamentoAtual = data ?? null;
    }

    if (idCliente && !clienteAtual) {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome, telefone, email")
        .eq("id", idCliente)
        .eq("id_salao", session.idSalao)
        .maybeSingle();

      clienteAtual = data ?? null;
    }

    const intentBloqueada = avaliarIntentPolicy(message);

    if (intentBloqueada) {
      const respostaBloqueio =
        "Eu posso te orientar, mas não executo ações no sistema. No app profissional eu apenas ajudo com informações, regras e passo a passo de uso.";

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

    const historicoOpenAI: OpenAIMessage[] = (historicoLimitado as HistoricoMensagem[]).map((item) => ({
      role: item.papel === "assistant" ? "assistant" : "user",
      content: compactText(item.conteudo, 700),
    }));

    const contextoCompacto = {
      session: {
        idSalao: session.idSalao,
        idProfissional: session.idProfissional,
      },
      profissional: profissionalResult.data
        ? {
            nome: profissionalResult.data.nome_exibicao || profissionalResult.data.nome,
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
Você é o assistente oficial do app profissional do SalaoPremium.

Seu papel:
- ajudar o profissional a entender e usar o app profissional
- responder em português do Brasil
- responder de forma humana, clara, curta e útil
- se o profissional mudar de assunto, ignore o contexto anterior e responda apenas o novo assunto
- usar o contexto real do sistema quando ele existir

Você NÃO pode:
- criar agendamentos
- cadastrar clientes
- executar ações no sistema
- trocar senha diretamente
- alterar comandas
- prometer funções que ainda não existem

Regras obrigatórias:
- se perguntarem sobre trocar senha, explique o caminho correto no app ou informe que a alteração é feita pelo sistema SaaS
- se perguntarem sobre cadastro, informe que o cadastro é feito somente pelo sistema SaaS
- se o profissional pedir suporte técnico do sistema, explique que haverá um chat exclusivo com o admin dono do sistema, mas que essa função ainda será implantada
- você pode informar status dos agendamentos
- você pode informar faturamento da semana, do mês e do ano
- você pode explicar telas, botões, fluxos e regras do app profissional
- se a informação não existir no contexto atual, diga isso claramente
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

    const answer =
      response.output_text || "Não consegui responder agora.";

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
    console.error("Erro no suporte IA:", error);

    return NextResponse.json(
      { error: "Erro ao processar a mensagem no suporte." },
      { status: 500 }
    );
  }
}
