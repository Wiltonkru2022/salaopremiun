import { createClienteAppAppointment } from "@/app/services/cliente-app/appointments";
import { listClienteAppAppointments } from "@/lib/client-app/queries";
import {
  mobileJson,
  mobileOptions,
  requireMobileClientAccess,
} from "../_cors";

export const OPTIONS = mobileOptions;

export async function GET(request: Request) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const idConta = String(url.searchParams.get("conta") || "").trim();
  if (!idConta) {
    return mobileJson({ ok: false, message: "Conta nao informada." }, { status: 401 });
  }

  const agendamentos = await listClienteAppAppointments({ idConta });
  return mobileJson({ ok: true, agendamentos });
}

export async function POST(request: Request) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const result = await createClienteAppAppointment({
    idSalao: String(body?.idSalao || ""),
    idConta: String(body?.idConta || ""),
    idServico: String(body?.idServico || ""),
    idsServicos: Array.isArray(body?.idsServicos) ? body.idsServicos : null,
    idProfissional: String(body?.idProfissional || ""),
    data: String(body?.data || ""),
    horaInicio: String(body?.horaInicio || ""),
    observacoes: String(body?.observacoes || ""),
    pessoaAgendadaTipo: body?.pessoaAgendadaTipo || null,
    pessoaAgendadaNome: body?.pessoaAgendadaNome || null,
    pessoaAgendadaWhatsapp: body?.pessoaAgendadaWhatsapp || null,
    pessoaAgendadaObservacao: body?.pessoaAgendadaObservacao || null,
    adicionaisIds: Array.isArray(body?.adicionaisIds) ? body.adicionaisIds : null,
    codigoCupom: body?.codigoCupom || null,
  });

  if (!result.ok) {
    return mobileJson({ ok: false, message: result.error }, { status: 400 });
  }

  return mobileJson(result);
}
