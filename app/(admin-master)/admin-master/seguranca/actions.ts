"use server";

import { revalidatePath } from "next/cache";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { captureSystemEvent } from "@/lib/monitoring/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function formText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function desbloquearUsuarioSegurancaAction(formData: FormData) {
  const admin = await requireAdminMasterUser("operacao_reprocessar");
  const userId = formText(formData, "userId");
  const tipoUsuario = formText(formData, "tipoUsuario") || "salao";

  if (!userId) {
    throw new Error("Usuário não informado.");
  }

  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_security_status")
    .update({
      status: "ativo",
      motivo: null,
      risco_atual: "baixo",
      bloqueado_ate: null,
      verificacao_necessaria: false,
      atualizado_em: now,
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error("Não foi possível desbloquear este usuário.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: admin.usuario.id,
    acao: "desbloquear_usuario_seguranca",
    entidade: "user_security_status",
    entidadeId: userId,
    descricao: "Usuário desbloqueado pelo Admin Master.",
    payload: { tipo_usuario: tipoUsuario },
  });

  void captureSystemEvent({
    module: "security",
    eventType: "admin_master_desbloqueou_usuario",
    severity: "info",
    message: "Usuário desbloqueado pelo Admin Master.",
    idUsuario: userId,
    idAdminUsuario: admin.usuario.id,
    origin: "server_action",
    route: "/admin-master/seguranca",
    success: true,
    createIncident: false,
    details: {
      tipoUsuario,
      adminEmail: admin.usuario.email,
    },
  });

  revalidatePath("/admin-master/seguranca");
}

export async function desbloquearSalaoSegurancaAction(formData: FormData) {
  const admin = await requireAdminMasterUser("operacao_reprocessar");
  const idSalao = formText(formData, "idSalao");

  if (!idSalao) {
    throw new Error("Salão não informado.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("saloes")
    .update({
      status_seguranca: "ativo",
      motivo_seguranca: null,
      bloqueado_ate: null,
    })
    .eq("id", idSalao);

  if (error) {
    throw new Error("Não foi possível desbloquear este salão.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: admin.usuario.id,
    acao: "desbloquear_salao_seguranca",
    entidade: "saloes",
    entidadeId: idSalao,
    descricao: "Salão desbloqueado pelo Admin Master.",
    payload: {},
  });

  void captureSystemEvent({
    module: "security",
    eventType: "admin_master_desbloqueou_salao",
    severity: "info",
    message: "Salão desbloqueado pelo Admin Master.",
    idSalao,
    idAdminUsuario: admin.usuario.id,
    origin: "server_action",
    route: "/admin-master/seguranca",
    success: true,
    createIncident: false,
    details: {
      tipoUsuario: "salao",
      adminEmail: admin.usuario.email,
    },
  });

  revalidatePath("/admin-master/seguranca");
}

export async function limparLogsSegurancaAction() {
  const admin = await requireAdminMasterUser("operacao_reprocessar");
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("security_login_attempts")
    .delete()
    .lt("criado_em", cutoff);

  if (error) {
    throw new Error("Não foi possível aplicar a retenção dos logs de segurança.");
  }

  await registrarAdminMasterAuditoria({
    idAdmin: admin.usuario.id,
    acao: "limpar_logs_seguranca",
    entidade: "security_login_attempts",
    descricao: "Retenção de logs de segurança executada no banco principal.",
    payload: { cutoff_principal: cutoff },
  });

  void captureSystemEvent({
    module: "security",
    eventType: "admin_master_limpeza_logs_seguranca",
    severity: "info",
    message: "Retenção de logs de segurança executada.",
    idAdminUsuario: admin.usuario.id,
    origin: "server_action",
    route: "/admin-master/seguranca",
    success: true,
    createIncident: false,
    details: { cutoff },
  });

  revalidatePath("/admin-master/seguranca");
}
