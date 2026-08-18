import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  parseProcessarClienteInput,
  processarClienteUseCase,
  ProcessarClienteUseCaseError,
} from "@/core/use-cases/clientes/processarCliente";
import { createClienteService } from "@/services/clienteService";
import { parseClienteBirthDate } from "@/lib/client-app/identity";
import {
  AuthzError,
  PlanAccessError,
  createSalaoMutacaoRouteService,
} from "@/services/salaoMutacaoRouteService";

const routeService = createSalaoMutacaoRouteService({
  permission: "clientes_ver",
  planFeature: "clientes",
  incidentKeyPrefix: "clientes:processar",
  module: "clientes",
  title: "Processamento de cliente falhou",
  fallbackMessage: "Erro interno ao processar cliente.",
  route: "/api/clientes/processar",
  getAction: (acaoRaw) => acaoRaw || null,
});

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acaoRaw = "";

  try {
    const input = parseProcessarClienteInput(await req.json());
    idSalao = input.idSalao;
    acaoRaw = input.acao;

    await routeService.validar(idSalao);

    const service = createClienteService();
    const existingClientId = String(input.cliente?.id || "").trim();
    const birthRaw = String(input.cliente?.data_nascimento || "").trim();
    if (birthRaw && !parseClienteBirthDate(birthRaw)) {
      return NextResponse.json(
        { error: "Informe uma data de nascimento valida." },
        { status: 400 }
      );
    }

    if (input.acao === "salvar" && existingClientId) {
      await service.validarIdentidadeAppVinculada({
        idSalao,
        idCliente: existingClientId,
        candidate: {
          cpf: input.cliente?.cpf || null,
          dataNascimento: input.cliente?.data_nascimento || null,
          whatsapp: input.cliente?.whatsapp || input.cliente?.telefone || null,
        },
      });
    }

    const result = await processarClienteUseCase({
      input,
      service,
    });

    if (input.acao === "salvar") {
      const idCliente = String(result.body.idCliente || "").trim();
      if (idCliente) {
        await service.sincronizarIdentidadeAppVinculada({
          idSalao,
          idCliente,
          candidate: {
            cpf: input.cliente?.cpf || null,
            dataNascimento: input.cliente?.data_nascimento || null,
            whatsapp: input.cliente?.whatsapp || input.cliente?.telefone || null,
          },
        });
      }
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || "Payload invalido.",
          issues: error.flatten(),
        },
        { status: 400 }
      );
    }

    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof PlanAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (error instanceof ProcessarClienteUseCaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (idSalao) {
      await routeService.reportarFalha({ idSalao, acaoRaw, error });
    }

    console.error("Erro geral ao processar cliente:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar cliente.",
      },
      { status: 500 }
    );
  }
}
