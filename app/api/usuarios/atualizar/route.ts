import { NextRequest, NextResponse } from "next/server";
import {
  atualizarUsuarioUseCase,
  parseAtualizarUsuarioInput,
} from "@/core/use-cases/usuarios/atualizarUsuario";
import {
  mapUsuarioRouteError,
  UsuarioRouteUseCaseError,
} from "@/core/use-cases/usuarios/route";
import { createAdminSalaoRouteService } from "@/services/adminSalaoRouteService";
import { createUsuarioService } from "@/services/usuarioService";

export async function PATCH(req: NextRequest) {
  try {
    const input = parseAtualizarUsuarioInput(await req.json());

    await createAdminSalaoRouteService().validarAdmin(input.idSalao);

    const result = await atualizarUsuarioUseCase({
      input,
      service: createUsuarioService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    try {
      mapUsuarioRouteError(error, "Erro interno ao atualizar usuario.");
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
        { error: "Erro interno ao atualizar usuario." },
        { status: 500 }
      );
    }
  }
}
