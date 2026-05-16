"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { PlanAccessError, assertCanMutatePlanFeature } from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const SPECIAL_TEMPLATES: Record<string, { nome: string; descricao: string; codigo: string }> = {
  maes: {
    nome: "Dia das Maes",
    descricao: "Um cuidado especial para celebrar o Dia das Maes.",
    codigo: "MAES",
  },
  namorados: {
    nome: "Dia dos Namorados",
    descricao: "Um presente para cuidar de você neste mês especial.",
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
  aniversario: {
    nome: "Aniversariantes do mês",
    descricao: "Um presente especial para clientes que fazem aniversário neste mês.",
    codigo: "NIVER",
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

async function requireCampaignMutation() {
  const context = await requireCampaignAdmin();
  try {
    await assertCanMutatePlanFeature(context.usuario.id_salao, "campanhas");
  } catch (error) {
    if (error instanceof PlanAccessError) {
      redirect(
        `/comparar-planos?recurso=campanhas&erro=${encodeURIComponent(error.message)}`
      );
    }
    throw error;
  }
  return context;
}

export async function criarCampanhaCupomAction(formData: FormData) {
  const { usuario } = await requireCampaignMutation();
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
    redirect("/campanhas/nova?erro=Preencha%20titulo%20e%20desconto.");
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
    redirect(`/campanhas/nova?erro=${encodeURIComponent(error?.message || "Não foi possível criar a campanha.")}`);
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

  if (publicoAlvo === "aniversariantes_mes") {
    const mesAtual = String(new Date().getMonth() + 1).padStart(2, "0");
    const { data: aniversariantes } = await (supabase as any)
      .from("clientes")
      .select("id, data_nascimento")
      .eq("id_salao", usuario.id_salao)
      .or("status.eq.ativo,ativo.eq.ativo")
      .not("data_nascimento", "is", null)
      .limit(200);

    const rowsClientes = ((aniversariantes || []) as Array<Record<string, unknown>>)
      .filter((cliente) => String(cliente.data_nascimento || "").slice(5, 7) === mesAtual)
      .map((cliente) => ({
        id_salao: usuario.id_salao,
        id_cupom: cupom.id,
        id_cliente: String(cliente.id || ""),
      }))
      .filter((row) => row.id_cliente);

    if (rowsClientes.length) {
      await (supabase as any).from("cupom_salao_clientes").insert(rowsClientes);
    }
  }

  revalidatePath("/campanhas");
  redirect(`/campanhas/${cupom.id}?ok=Campanha%20criada.`);
}

export async function atualizarStatusCampanhaAction(formData: FormData) {
  const { usuario } = await requireCampaignMutation();
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

export async function atualizarCampanhaAction(formData: FormData) {
  const { usuario } = await requireCampaignMutation();
  const id = String(formData.get("id") || "").trim();
  const titulo = String(formData.get("titulo") || "").trim();
  const mensagemCliente = String(formData.get("mensagem_cliente") || "").trim();
  const descricaoInterna = String(formData.get("descricao_interna") || "").trim();
  const statusCampanha =
    String(formData.get("status_campanha") || "ativa") === "pausada"
      ? "pausada"
      : "ativa";
  const publicoTipo = String(formData.get("publico_tipo") || "link");

  if (!id || !titulo) {
    redirect(`/campanhas/${id || ""}?erro=Preencha%20o%20nome%20da%20campanha.`);
  }

  const { error } = await (getSupabaseAdmin() as any)
    .from("cupons_salao")
    .update({
      nome: titulo,
      descricao_interna: descricaoInterna,
      mensagem_cliente: mensagemCliente,
      descricao: mensagemCliente,
      status_campanha: statusCampanha,
      ativo: statusCampanha === "ativa",
      publico_tipo: ["link", "clientes_especificos", "novos_clientes"].includes(publicoTipo)
        ? publicoTipo
        : "link",
      valido_de: String(formData.get("valido_de") || "").slice(0, 10) || null,
      valido_ate: String(formData.get("valido_ate") || "").slice(0, 10) || null,
      limite_uso_total: Number(formData.get("limite_total") || 0) || null,
      limite_uso_cliente: Number(formData.get("limite_cliente") || 1) || 1,
      limite_uso_dia: Number(formData.get("limite_dia") || 0) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("id_salao", usuario.id_salao);

  if (error) {
    redirect(`/campanhas/${id}?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/campanhas");
  revalidatePath(`/campanhas/${id}`);
  redirect(`/campanhas/${id}?ok=Campanha%20atualizada.`);
}

export async function adicionarClienteCampanhaAction(formData: FormData) {
  const { usuario } = await requireCampaignMutation();
  const idCampanha = String(formData.get("id_campanha") || "").trim();
  const idCliente = String(formData.get("id_cliente") || "").trim();

  if (!idCampanha || !idCliente) {
    redirect(`/campanhas/${idCampanha || ""}?erro=Selecione%20um%20cliente.`);
  }

  const supabase = getSupabaseAdmin();
  const { data: cliente } = await (supabase as any)
    .from("clientes")
    .select("id")
    .eq("id_salao", usuario.id_salao)
    .eq("id", idCliente)
    .or("status.eq.ativo,ativo.eq.ativo")
    .limit(1)
    .maybeSingle();

  if (!cliente?.id) {
    redirect(`/campanhas/${idCampanha}?erro=Cliente%20ativo%20nao%20encontrado.`);
  }

  const { data: existente } = await (supabase as any)
    .from("cupom_salao_clientes")
    .select("id_cupom")
    .eq("id_salao", usuario.id_salao)
    .eq("id_cupom", idCampanha)
    .eq("id_cliente", idCliente)
    .limit(1)
    .maybeSingle();

  const { error } = existente?.id_cupom
    ? { error: null }
    : await (supabase as any).from("cupom_salao_clientes").insert({
        id_salao: usuario.id_salao,
        id_cupom: idCampanha,
        id_cliente: idCliente,
      });

  if (error) {
    redirect(`/campanhas/${idCampanha}?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/campanhas/${idCampanha}`);
  redirect(`/campanhas/${idCampanha}?ok=Cliente%20adicionado.`);
}

export async function removerClienteCampanhaAction(formData: FormData) {
  const { usuario } = await requireCampaignMutation();
  const idCampanha = String(formData.get("id_campanha") || "").trim();
  const idCliente = String(formData.get("id_cliente") || "").trim();

  if (!idCampanha || !idCliente) redirect("/campanhas?erro=Cliente%20invalido.");

  await (getSupabaseAdmin() as any)
    .from("cupom_salao_clientes")
    .delete()
    .eq("id_salao", usuario.id_salao)
    .eq("id_cupom", idCampanha)
    .eq("id_cliente", idCliente);

  revalidatePath(`/campanhas/${idCampanha}`);
  redirect(`/campanhas/${idCampanha}?ok=Cliente%20removido.`);
}

export async function excluirCampanhaAction(formData: FormData) {
  const { usuario } = await requireCampaignMutation();
  const idCampanha = String(formData.get("id_campanha") || "").trim();
  const confirmacao = String(formData.get("confirmacao") || "").trim().toUpperCase();

  if (!idCampanha || confirmacao !== "EXCLUIR") {
    redirect(`/campanhas/${idCampanha || ""}?erro=Digite%20EXCLUIR%20para%20confirmar.`);
  }

  const supabase = getSupabaseAdmin();
  const { data: campanha } = await (supabase as any)
    .from("cupons_salao")
    .select("id, id_salao")
    .eq("id", idCampanha)
    .eq("id_salao", usuario.id_salao)
    .limit(1)
    .maybeSingle();

  if (!campanha?.id) {
    redirect("/campanhas?erro=Campanha%20nao%20encontrada.");
  }

  const { error } = await (supabase as any)
    .from("cupons_salao")
    .delete()
    .eq("id", idCampanha)
    .eq("id_salao", usuario.id_salao);

  if (error) {
    redirect(`/campanhas/${idCampanha}?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/campanhas");
  revalidatePath(`/campanhas/${idCampanha}`);
  redirect("/campanhas?ok=Campanha%20excluida.");
}

export async function auditarCampanhasAction() {
  const { usuario } = await requireCampaignMutation();
  const supabase = getSupabaseAdmin();

  const { data: cupons } = await (supabase as any)
    .from("cupons_salao")
    .select("id")
    .eq("id_salao", usuario.id_salao)
    .order("created_at", { ascending: false })
    .limit(250);

  const cupomIds = ((cupons || []) as Array<Record<string, unknown>>)
    .map((cupom) => String(cupom.id || ""))
    .filter(Boolean);

  if (!cupomIds.length) {
    redirect("/campanhas?ok=Nenhuma%20campanha%20para%20auditar.");
  }

  const [{ data: agendamentos }, { data: eventos }] = await Promise.all([
    (supabase as any)
      .from("agendamentos")
      .select("id, id_cupom_salao, cliente_id, servico_id, status, created_at")
      .eq("id_salao", usuario.id_salao)
      .in("id_cupom_salao", cupomIds)
      .limit(5000),
    (supabase as any)
      .from("campanha_eventos")
      .select("id_cupom, tipo, metadata")
      .eq("id_salao", usuario.id_salao)
      .in("id_cupom", cupomIds)
      .in("tipo", ["agendamento", "cancelamento"])
      .limit(10000),
  ]);

  const existentes = new Set<string>();
  for (const evento of ((eventos || []) as Array<Record<string, any>>)) {
    const idAgendamento = String(evento.metadata?.id_agendamento || "");
    if (idAgendamento) {
      existentes.add(`${String(evento.id_cupom || "")}:${String(evento.tipo || "")}:${idAgendamento}`);
    }
  }

  const novosEventos = ((agendamentos || []) as Array<Record<string, unknown>>)
    .map((agenda) => {
      const idCupom = String(agenda.id_cupom_salao || "");
      const idAgendamento = String(agenda.id || "");
      const status = String(agenda.status || "").trim().toLowerCase();
      const tipo = status === "cancelado" || status === "cancelada" ? "cancelamento" : "agendamento";
      if (!idCupom || !idAgendamento || existentes.has(`${idCupom}:${tipo}:${idAgendamento}`)) return null;
      return {
        id_salao: usuario.id_salao,
        id_cupom: idCupom,
        id_cliente: String(agenda.cliente_id || "") || null,
        tipo,
        created_at: String(agenda.created_at || new Date().toISOString()),
        metadata: {
          origem: "auditoria_campanha",
          id_agendamento: idAgendamento,
          id_servico: String(agenda.servico_id || "") || null,
          status_original: status || null,
        },
      };
    })
    .filter(Boolean);

  if (novosEventos.length) {
    const { error } = await (supabase as any)
      .from("campanha_eventos")
      .insert(novosEventos.slice(0, 2000));

    if (error) {
      redirect(`/campanhas?erro=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath("/campanhas");
  redirect(`/campanhas?ok=${encodeURIComponent(`${novosEventos.length} evento(s) antigo(s) auditado(s).`)}`);
}

export async function atualizarServicosCampanhaAction(formData: FormData) {
  const { usuario } = await requireCampaignMutation();
  const idCampanha = String(formData.get("id_campanha") || "").trim();
  const servicos = formData
    .getAll("servicos")
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (!idCampanha) redirect("/campanhas?erro=Campanha%20invalida.");

  const supabase = getSupabaseAdmin();
  const { error: deleteError } = await (supabase as any)
    .from("cupom_salao_servicos")
    .delete()
    .eq("id_salao", usuario.id_salao)
    .eq("id_cupom", idCampanha);

  if (deleteError) {
    redirect(`/campanhas/${idCampanha}?erro=${encodeURIComponent(deleteError.message)}`);
  }

  if (servicos.length) {
    const rows = servicos.map((idServico) => ({
      id_salao: usuario.id_salao,
      id_cupom: idCampanha,
      id_servico: idServico,
      tipo_beneficio: String(formData.get(`beneficio_tipo_${idServico}`) || "desconto_percentual"),
      valor_beneficio: Number(formData.get(`beneficio_valor_${idServico}`) || 0) || null,
      brinde_descricao: String(formData.get(`beneficio_brinde_${idServico}`) || "").trim() || null,
      limite_uso_servico: Number(formData.get(`limite_servico_${idServico}`) || 0) || null,
    }));

    const { error: insertError } = await (supabase as any)
      .from("cupom_salao_servicos")
      .insert(rows);

    if (insertError) {
      redirect(`/campanhas/${idCampanha}?erro=${encodeURIComponent(insertError.message)}`);
    }
  }

  revalidatePath("/campanhas");
  revalidatePath(`/campanhas/${idCampanha}`);
  redirect(`/campanhas/${idCampanha}?ok=Serviços%20atualizados.`);
}
