import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { geocodeSalonAddress } from "@/lib/saloes/geocoding";

export async function POST(request: Request) {
  const { user, usuario } = await getPainelUserContext();

  if (!user || !usuario?.id_salao) {
    return NextResponse.json(
      { message: "Sessao expirada. Entre novamente para atualizar o endereco." },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        cep?: string;
        endereco?: string;
        numero?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
      }
    | null;

  const coordinates = await geocodeSalonAddress({
    cep: body?.cep,
    endereco: body?.endereco,
    numero: body?.numero,
    bairro: body?.bairro,
    cidade: body?.cidade,
    estado: body?.estado,
  }).catch(() => null);

  if (!coordinates) {
    return NextResponse.json({
      ok: true,
      coordinates: null,
      message: "Endereco salvo. Nao foi possivel localizar o ponto automaticamente.",
    });
  }

  return NextResponse.json({
    ok: true,
    coordinates,
  });
}
