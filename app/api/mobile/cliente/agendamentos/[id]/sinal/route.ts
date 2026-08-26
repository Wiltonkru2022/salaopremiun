import { getDatabaseAdmin } from "@/lib/db/admin";
import { uploadBufferToCloudinary } from "@/lib/platform/cloudinary.server";
import {
  mobileJson,
  mobileOptions,
  requireMobileClientAccess,
} from "../../../_cors";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf"]);

export const OPTIONS = mobileOptions;

async function loadSignalAppointment(params: {
  idAgendamento: string;
  idConta: string;
}) {
  const database = getDatabaseAdmin();
  const { data: agendamento } = await database
    .from("agendamentos")
    .select(
      "id, cliente_id, id_salao, data, hora_inicio, status, sinal_valor, sinal_status, sinal_percentual, sinal_pix_chave, sinal_pix_recebedor, sinal_pix_cidade, sinal_confirmacao_responsavel, sinal_comprovante_path, servicos(nome, preco_padrao, preco), profissionais(nome, nome_exibicao)"
    )
    .eq("id", params.idAgendamento)
    .maybeSingle();

  if (!agendamento?.id) return null;

  const { data: vinculo } = await database
    .from("clientes_auth")
    .select("id_cliente")
    .eq("id_cliente", agendamento.cliente_id)
    .eq("app_conta_id", params.idConta)
    .maybeSingle();

  if (!vinculo?.id_cliente) return null;

  return agendamento;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;

  const { id } = await context.params;
  const url = new URL(request.url);
  const idConta = String(url.searchParams.get("conta") || "").trim();
  const agendamento = await loadSignalAppointment({ idAgendamento: id, idConta });

  if (!agendamento) {
    return mobileJson({ ok: false, message: "Agendamento nao encontrado." }, { status: 404 });
  }

  const servico = agendamento.servicos as
    | { nome?: string | null; preco_padrao?: number | null; preco?: number | null }
    | null;
  const profissional = agendamento.profissionais as
    | { nome?: string | null; nome_exibicao?: string | null }
    | null;

  return mobileJson({
    ok: true,
    sinal: {
      id: String(agendamento.id),
      data: String(agendamento.data || ""),
      horaInicio: String(agendamento.hora_inicio || ""),
      status: String(agendamento.status || ""),
      sinalStatus: String(agendamento.sinal_status || ""),
      valor: Number(agendamento.sinal_valor || 0),
      percentual: Number(agendamento.sinal_percentual || 0),
      chavePix: String(agendamento.sinal_pix_chave || ""),
      recebedor: String(agendamento.sinal_pix_recebedor || "SalaoPremium"),
      cidade: String(agendamento.sinal_pix_cidade || "Brasil"),
      servicoNome: String(servico?.nome || "Servico"),
      valorTotal: Number(servico?.preco_padrao ?? servico?.preco ?? 0),
      profissionalNome:
        String(profissional?.nome_exibicao || "").trim() ||
        String(profissional?.nome || "").trim() ||
        "Profissional",
      comprovanteEnviado: Boolean(agendamento.sinal_comprovante_path),
    },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;

  const { id } = await context.params;
  const formData = await request.formData();
  const idConta = String(formData.get("idConta") || "").trim();
  const file = formData.get("comprovante");
  const agendamento = await loadSignalAppointment({
    idAgendamento: id,
    idConta,
  });

  if (!agendamento) {
    return mobileJson({ ok: false, message: "Agendamento nao encontrado." }, { status: 404 });
  }

  if (!(file instanceof File) || file.size <= 0) {
    return mobileJson({ ok: false, message: "Escolha uma imagem ou PDF do comprovante." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return mobileJson({ ok: false, message: "O arquivo precisa ter ate 10 MB." }, { status: 400 });
  }

  const type = file.type || "application/octet-stream";
  if (!type.startsWith("image/") && !ALLOWED_TYPES.has(type)) {
    return mobileJson({ ok: false, message: "Envie uma imagem ou PDF." }, { status: 400 });
  }

  let comprovanteUrl = "";
  try {
    const uploaded = await uploadBufferToCloudinary({
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeType: type,
      folder: `salaopremiun/comprovantes/${agendamento.id_salao}/${id}`,
    });
    comprovanteUrl = uploaded.secureUrl;
  } catch {
    return mobileJson(
      { ok: false, message: "Nao foi possivel enviar o comprovante." },
      { status: 500 }
    );
  }

  if (!comprovanteUrl) {
    return mobileJson(
      { ok: false, message: "Nao foi possivel obter a URL do comprovante." },
      { status: 500 }
    );
  }

  const database = getDatabaseAdmin();
  await database
    .from("agendamentos")
    .update({
      status:
        String(agendamento.sinal_confirmacao_responsavel || "") === "profissional"
          ? "aguardando_confirmacao_profissional"
          : "aguardando_confirmacao_salao",
      sinal_status: "comprovante_enviado",
      sinal_comprovante_path: comprovanteUrl,
      sinal_comprovante_nome: file.name || "comprovante",
      sinal_comprovante_tipo: type,
      sinal_comprovante_enviado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return mobileJson({
    ok: true,
    message: "Comprovante enviado. Aguardando confirmacao.",
  });
}
