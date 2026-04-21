import { z } from "zod";
import type {
  HistoricoMensagem,
  SuporteRequestBody,
} from "@/types/profissional";
import type {
  AppProfissionalSuporteContexto,
  AppProfissionalSuporteService,
} from "@/services/appProfissionalSuporteService";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const suporteRequestSchema = z.object({
  message: z.string().optional(),
  origemPagina: z.string().nullable().optional(),
  idComanda: z.string().nullable().optional(),
  idAgendamento: z.string().nullable().optional(),
  idCliente: z.string().nullable().optional(),
});

export class ProcessarSuporteIAUseCaseError extends Error {
  constructor(
    message: string,
    public status: number,
    public idSalao?: string
  ) {
    super(message);
    this.name = "ProcessarSuporteIAUseCaseError";
  }
}

function parseUUID(value: unknown) {
  const parsed = String(value || "").trim();

  if (
    !parsed ||
    parsed === "null" ||
    parsed === "undefined" ||
    !UUID_REGEX.test(parsed)
  ) {
    return null;
  }

  return parsed;
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

function mapHistoricoToOpenAI(
  value: unknown
): Array<{ role: "user" | "assistant"; content: string }> {
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

  const parsed = suporteRequestSchema.safeParse(input);
  return parsed.success ? parsed.data : {};
}

function buildSystemPrompt(contextoCompacto: Record<string, unknown>) {
  return `
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
${JSON.stringify(contextoCompacto, null, 2)}
`;
}

export type ProcessarSuporteIAResult = {
  status: number;
  idSalao?: string;
  body: Record<string, unknown>;
};

export async function processarSuporteIAUseCase(params: {
  body: unknown;
  service: AppProfissionalSuporteService;
}): Promise<ProcessarSuporteIAResult> {
  let idSalao = "";

  try {
    const body = parseSuporteRequestBody(params.body);
    const message = compactText(body?.message, 900);
    const contexto: AppProfissionalSuporteContexto = {
      origemPagina: String(body?.origemPagina || "").trim() || null,
      idComanda: parseUUID(body?.idComanda),
      idAgendamento: parseUUID(body?.idAgendamento),
      idCliente: parseUUID(body?.idCliente),
    };

    if (!message) {
      throw new ProcessarSuporteIAUseCaseError("Digite uma mensagem.", 400);
    }

    const session = await params.service.requireSession();
    idSalao = session.idSalao;

    const conversa = await params.service.buscarOuCriarConversa({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      contexto,
    });

    await params.service.salvarMensagem({
      idConversa: conversa.id,
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      papel: "user",
      conteudo: message,
    });

    const historico = await params.service.listarHistorico({
      idConversa: conversa.id,
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      limite: 20,
    });

    const intentBloqueada = avaliarIntentPolicy(message);

    if (intentBloqueada) {
      const respostaBloqueio =
        "Eu posso te orientar, mas nao executo acoes no sistema. No app profissional eu apenas ajudo com informacoes, regras e passo a passo de uso.";

      await params.service.salvarMensagem({
        idConversa: conversa.id,
        idSalao: session.idSalao,
        idProfissional: session.idProfissional,
        papel: "assistant",
        conteudo: respostaBloqueio,
      });

      return {
        status: 200,
        idSalao,
        body: {
          answer: respostaBloqueio,
          conversaId: conversa.id,
          blockedIntent: intentBloqueada.intent,
        },
      };
    }

    const contextoOperacional = await params.service.carregarContextoOperacional({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      contexto,
    });

    const contextoCompacto = {
      session: {
        idSalao: session.idSalao,
        idProfissional: session.idProfissional,
      },
      ...contextoOperacional,
    };

    const historicoOpenAI = mapHistoricoToOpenAI(historico.slice(-4));
    const answer = await params.service.gerarRespostaIA({
      systemPrompt: buildSystemPrompt(contextoCompacto),
      historico: historicoOpenAI,
    });

    await params.service.salvarMensagem({
      idConversa: conversa.id,
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      papel: "assistant",
      conteudo: answer,
    });

    return {
      status: 200,
      idSalao,
      body: {
        answer,
        conversaId: conversa.id,
      },
    };
  } catch (error) {
    if (error instanceof ProcessarSuporteIAUseCaseError) {
      error.idSalao = error.idSalao || idSalao;
      throw error;
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      throw new ProcessarSuporteIAUseCaseError(
        "Sessao do profissional nao encontrada.",
        401,
        idSalao
      );
    }

    throw new ProcessarSuporteIAUseCaseError(
      error instanceof Error
        ? error.message
        : "Erro ao processar a mensagem no suporte.",
      500,
      idSalao
    );
  }
}
