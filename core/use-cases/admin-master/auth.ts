import type { AdminMasterAuthService } from "@/services/adminMasterAuthService";

export async function obterAdminMasterAccessUseCase(params: {
  nextPath: string | null;
  service: AdminMasterAuthService;
}) {
  const access = await params.service.getAccess("dashboard_ver");

  if (!access.ok) {
    return {
      status: access.status,
      body: {
        ok: false,
        message: access.message,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      redirectTo: params.service.resolveRedirectTo(params.nextPath),
      usuario: {
        id: access.usuario.id,
        nome: access.usuario.nome,
        perfil: access.usuario.perfil,
      },
    },
  };
}
