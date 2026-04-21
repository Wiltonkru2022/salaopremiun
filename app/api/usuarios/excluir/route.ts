import { NextResponse } from "next/server";
import {
  excluirUsuarioUseCase,
  parseExcluirUsuarioInput,
} from "@/core/use-cases/usuarios/excluirUsuario";
import {
  mapUsuarioRouteError,
  UsuarioRouteUseCaseError,
} from "@/core/use-cases/usuarios/route";
import { createAdminSalaoRouteService } from "@/services/adminSalaoRouteService";
import { createUsuarioService } from "@/services/usuarioService";

export async function DELETE(req: Request) {
  try {
    const input = parseExcluirUsuarioInput(await req.json());

    await createAdminSalaoRouteService().validarAdmin(input.idSalao);

    const result = await excluirUsuarioUseCase({
      input,
      service: createUsuarioService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    try {
      mapUsuarioRouteError(error, "Erro interno ao excluir usuario.");
    } catch (mapped) {
      if (mapped instanceof UsuarioRouteUseCaseError) {
        return NextResponse.json(
          {
            error: mapped.message,
            ...(mapped.code ? { code: mapped.code } : {}),
            ...(mapped.issues ? { issues: mapped.issues } : {}),
          },
          { status: mapped.status }
        );
      }

      return NextResponse.json(
        { error: "Erro interno ao excluir usuario." },
        { status: 500 }
      );
    }
  }
}
