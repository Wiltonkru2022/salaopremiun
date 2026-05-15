"use server";

import { revalidatePath } from "next/cache";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import {
  queueOracleVpsSecurityCleanup,
  sendOracleVpsSecurityEvent,
} from "@/lib/oracle-vps/client";
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

  void sendOracleVpsSecurityEvent({
    type: "security_event",
    severity: "info",
    module: "security",
    eventType: "admin_master_desbloqueou_usuario",
    source: "admin-master",
    idUsuario: userId,
    userId,
    tipoUsuario,
    details: {
      id_admin_master: admin.usuario.id,
      admin_email: admin.usuario.email,
    },
    message: "Usuário desbloqueado pelo Admin Master.",
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

  void sendOracleVpsSecurityEvent({
    type: "security_event",
    severity: "info",
    module: "security",
    eventType: "admin_master_desbloqueou_salao",
    source: "admin-master",
    idSalao,
    tipoUsuario: "salao",
    details: {
      id_admin_master: admin.usuario.id,
      admin_email: admin.usuario.email,
    },
    message: "Salão desbloqueado pelo Admin Master.",
  });

  revalidatePath("/admin-master/seguranca");
}

export async function limparLogsSegurancaAction() {
  const admin = await requireAdminMasterUser("operacao_reprocessar");
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from("security_login_attempts").delete().lt("criado_em", cutoff);
  const result = await queueOracleVpsSecurityCleanup({
    securityRetentionDays: 90,
    requestedBy: admin.usuario.email,
  });

  await registrarAdminMasterAuditoria({
    idAdmin: admin.usuario.id,
    acao: "limpar_logs_seguranca",
    entidade: "security_events",
    descricao:
      "Retenção de logs de segurança executada no banco principal e na VPS.",
    payload: { cutoff_principal: cutoff, result },
  });

  revalidatePath("/admin-master/seguranca");
}
