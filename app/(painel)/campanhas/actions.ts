"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const SPECIAL_TEMPLATES: Record<string, { nome: string; descricao: string; codigo: string }> = {
  maes: {
    nome: "Dia das Maes",
    descricao: "Um cuidado especial para celebrar o Dia das Maes.",
    codigo: "MAES",
  },
  namorados: {
    nome: "Dia dos Namorados",
    descricao: "Um presente para cuidar de voce neste mes especial.",
    codigo: "AMOR",
  },
  natal: {
    nome: "Natal Premium",
    descricao: "Entre no clima de fim de ano com um cuidado especial.",
    codigo: "NATAL",
  },
  black_friday: {
    nome: "Black Friday",
    descricao: "Oferta por tempo limitado para agendar seu atendimento.",
    codigo: "BLACK",
  },
};

function token() {
  return randomBytes(18).toString("base64url");
}

function normalizeCode(value: string, fallback: string) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 14);
  return normalized || fallback;
}

function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function requireCampaignAdmin() {
  const { user, usuario } = await getPainelUserContext();
  if (!user || !usuario?.id_salao) redirect("/login");

  if (String(usuario.nivel || "").toLowerCase() !== "admin") {
    redirect("/dashboard");
  }

  return { user, usuario };
}

export async function criarCampanhaCupomAction(formData: FormData) {
  const { usuario } = await requireCampaignAdmin();
  const tipo = String(formData.get("tipo") || "manual");
  const templateKey = String(formData.get("template") || "");
  const template = SPECIAL_TEMPLATES[templateKey];
  const titulo = String(formData.get("titulo") || template?.nome || "").trim();
  const descricao = String(formData.get("descricao") || template?.descricao || "").trim();
  const codigo = normalizeCode(
    String(formData.get("codigo") || template?.codigo || titulo),
    "CUPOM"
  );
  const descontoTipo = String(formData.get("tipo_desconto") || "percentual") === "valor_fixo"
    ? "valor_fixo"
    : "percentual";
  const valorDesconto = Math.max(0, Number(formData.get("valor_desconto") || 0));
  const validoAte = String(formData.get("valido_ate") || futureDate(30)).slice(0, 10);
  const publicoAlvo = String(formData.get("publico_alvo") || "manual");
  const diasInativo =
    publicoAlvo === "inativos_30"
      ? 30
      : publicoAlvo === "inativos_45"
        ? 45
        : publicoAlvo === "inativos_60"
          ? 60
          : null;

  if (!titulo || valorDesconto <= 0) {
    redirect("/campanhas?erro=Preencha%20titulo%20e%20desconto.");
  }

  const { error } = await (getSupabaseAdmin() as any).from("cupons_salao").insert({
    id_salao: usuario.id_salao,
    codigo: `${codigo}${randomBytes(2).toString("hex").toUpperCase()}`,
    nome: titulo,
    descricao,
    tipo_desconto: descontoTipo,
    valor_desconto: valorDesconto,
    valor_minimo: Number(formData.get("valor_minimo") || 0) || 0,
    limite_uso_cliente: 1,
    limite_uso_total: Number(formData.get("limite_total") || 0) || null,
    dias_cliente_inativo: diasInativo,
    valido_de: new Date().toISOString().slice(0, 10),
    valido_ate: validoAte,
    ativo: true,
    automatico_recuperacao: tipo === "inativos",
    tipo_campanha: tipo,
    publico_alvo: publicoAlvo,
    titulo_push: titulo,
    mensagem_push: descricao || `Voce recebeu um cupom: ${titulo}.`,
    resgate_token: token(),
    requer_resgate: true,
    push_delay_minutos: Number(formData.get("push_delay_minutos") || 5) || 5,
    criado_por_painel: usuario.id,
    origem: "campanhas_dev",
    metadata: {
      modo: "desenvolvimento",
      envio_whatsapp: "manual",
      template: templateKey || null,
    },
  });

  if (error) {
    redirect(`/campanhas?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/campanhas");
  redirect("/campanhas?ok=Campanha%20criada.");
}
