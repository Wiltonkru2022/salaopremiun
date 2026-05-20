import { NextResponse } from "next/server";
import {
  assertPublicRateLimit,
  getPublicRateLimitIdentity,
} from "@/lib/security/public-rate-limit";
import { verificarCadastroSalaoDuplicado } from "@/services/cadastroSalaoVerificacaoService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const publicRoute = "rota publica: prevalidacao de cadastro com rate limit.";

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(request: Request) {
  assertPublicRateLimit({
    key: getPublicRateLimitIdentity(request, "cadastro-salao-verificar"),
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  const body = await request.json().catch(() => ({}));
  const email = normalizeText(body.email).toLowerCase();
  const nomeSalao = normalizeText(body.nomeSalao);
  const whatsapp = onlyNumbers(normalizeText(body.whatsapp));
  const cpfCnpj = onlyNumbers(normalizeText(body.cpfCnpj));

  const exists = await verificarCadastroSalaoDuplicado({
    email,
    nomeSalao,
    whatsapp,
    cpfCnpj,
  });

  return NextResponse.json({ exists });
}
