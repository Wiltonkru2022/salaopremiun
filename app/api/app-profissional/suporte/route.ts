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

  if (!parsed || parsed === "null" || parsed === "undefined") {
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

function somarTotais(rows: any[] | null | undefined) {
  return Number(
    (rows ?? [])
      .reduce((acc: number, item: any) => acc + Number(item.total || 0), 0)
      .toFixed(2)
  );
}

function contarPorStatus(rows: any[] | null | undefined) {
  const mapa: Record<string, number> = {};

  for (const item of rows ?? []) {
    const status = String(item.status || "sem_status").toLowerCase();
    mapa[status] = (mapa[status] || 0) + 1;
  }

  return mapa;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = String(body?.message || "").trim();
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

    let comandaAtual: any = null;
    let agendamentoAtual: any = null;
    let clienteAtual: any = null;

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

    const pedido = message.toLowerCase();

    const bloqueios = [
      "cria agendamento",
      "criar agendamento",
      "agenda para mim",
      "agenda esse cliente",
      "cadastra cliente",
      "cadastrar cliente",
      "cria cliente",
      "troca minha senha",
      "altera senha",
      "muda senha",
      "faz o agendamento",
      "confirma o agendamento",
    ];

    if (bloqueios.some((termo) => pedido.includes(termo))) {
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
      });
    }

    const historicoLimitado = historico.slice(-6);

    const historicoOpenAI = historicoLimitado.map((item: any) => ({
      role: item.papel === "assistant" ? "assistant" : "user",
      content: item.conteudo,
    }));

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
    session,
    profissional: profissionalResult.data ?? null,
    agendaHoje: agendaHojeResult.data ?? [],
    origemPagina,
    comandaAtual,
    agendamentoAtual,
    clienteAtual,
    resumoFinanceiro,
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
    ...historicoOpenAI.map((msg: any) => ({
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
