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

function slugify(value: string) {
  return (
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `campanha-${Date.now()}`
  );
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
  const descricaoInterna = String(formData.get("descricao_interna") || "").trim();
  const mensagemCliente = String(formData.get("mensagem_cliente") || descricao).trim();
  const codigo = normalizeCode(
    String(formData.get("codigo") || template?.codigo || titulo),
    "CUPOM"
  );
  const descontoTipo = String(formData.get("tipo_desconto") || "percentual") === "valor_fixo"
    ? "valor_fixo"
    : "percentual";
  const valorDesconto = Math.max(0, Number(formData.get("valor_desconto") || 0));
  const validoAte = String(formData.get("valido_ate") || futureDate(30)).slice(0, 10);
  const validoDe = String(formData.get("valido_de") || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const publicoAlvo = String(formData.get("publico_alvo") || "manual");
  const statusCampanha = String(formData.get("status_campanha") || "ativa") === "pausada"
    ? "pausada"
    : "ativa";
  const publicoTipo = String(formData.get("publico_tipo") || "link");
  const slug = `${slugify(String(formData.get("slug") || titulo))}-${randomBytes(2).toString("hex")}`;
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

  const supabase = getSupabaseAdmin();
  const { data: cupom, error } = await (supabase as any).from("cupons_salao").insert({
    id_salao: usuario.id_salao,
    codigo: `${codigo}${randomBytes(2).toString("hex").toUpperCase()}`,
    nome: titulo,
    descricao,
    descricao_interna: descricaoInterna,
    mensagem_cliente: mensagemCliente,
    tipo_desconto: descontoTipo,
    valor_desconto: valorDesconto,
    valor_minimo: Number(formData.get("valor_minimo") || 0) || 0,
    limite_uso_cliente: Number(formData.get("limite_cliente") || 1) || 1,
    limite_uso_total: Number(formData.get("limite_total") || 0) || null,
    dias_cliente_inativo: diasInativo,
    valido_de: validoDe,
    valido_ate: validoAte,
    ativo: true,
    status_campanha: statusCampanha,
    automatico_recuperacao: tipo === "inativos",
    tipo_campanha: tipo,
    publico_alvo: publicoAlvo,
    titulo_push: titulo,
    mensagem_push: mensagemCliente || `Voce recebeu um cupom: ${titulo}.`,
    resgate_token: token(),
    slug,
    requer_resgate: true,
    limite_uso_dia: Number(formData.get("limite_dia") || 0) || null,
    limite_por_telefone_email: String(formData.get("limite_telefone_email") || "on") === "on",
    publico_tipo: ["link", "clientes_especificos", "novos_clientes"].includes(publicoTipo)
      ? publicoTipo
      : "link",
    push_delay_minutos: Number(formData.get("push_delay_minutos") || 5) || 5,
    criado_por_painel: usuario.id,
    origem: "campanhas_dev",
    metadata: {
      modo: "desenvolvimento",
      envio_whatsapp: "manual",
      template: templateKey || null,
    },
  }).select("id").single();

  if (error || !cupom?.id) {
    redirect(`/campanhas?erro=${encodeURIComponent(error?.message || "Nao foi possivel criar a campanha.")}`);
  }

  const servicos = formData
    .getAll("servicos")
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (servicos.length) {
    const rows = servicos.map((idServico) => ({
      id_salao: usuario.id_salao,
      id_cupom: cupom.id,
      id_servico: idServico,
      tipo_beneficio: String(formData.get(`beneficio_tipo_${idServico}`) || "desconto_percentual"),
      valor_beneficio: Number(formData.get(`beneficio_valor_${idServico}`) || valorDesconto) || valorDesconto,
      brinde_descricao: String(formData.get(`beneficio_brinde_${idServico}`) || "").trim() || null,
      limite_uso_servico: Number(formData.get(`limite_servico_${idServico}`) || 0) || null,
    }));
    await (supabase as any).from("cupom_salao_servicos").insert(rows);
  }

  revalidatePath("/campanhas");
  redirect("/campanhas?ok=Campanha%20criada.");
}

export async function atualizarStatusCampanhaAction(formData: FormData) {
  const { usuario } = await requireCampaignAdmin();
  const id = String(formData.get("id") || "").trim();
  const status = String(formData.get("status") || "").trim();

  if (!id || !["ativa", "pausada"].includes(status)) {
    redirect("/campanhas?erro=Campanha%20invalida.");
  }

  await (getSupabaseAdmin() as any)
    .from("cupons_salao")
    .update({
      status_campanha: status,
      ativo: status === "ativa",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("id_salao", usuario.id_salao);

  revalidatePath("/campanhas");
  redirect("/campanhas?ok=Campanha%20atualizada.");
}
