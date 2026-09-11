"use server";

import { revalidatePath } from "next/cache";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getMfaAssurance } from "@/lib/auth/mfa-assurance";
import { captureSystemEvent } from "@/lib/monitoring/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type SecurityActionResult = {
  ok: boolean;
  message: string;
  mfaRequired?: boolean;
};

function formText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

async function requireSensitiveSecurityAction() {
  const admin = await requireAdminMasterUser("operacao_reprocessar");
  const assurance = await getMfaAssurance();
  if (assurance.aal !== "aal2" || assurance.subject !== admin.authUser.id) {
    return {
      admin,
      denied: {
        ok: false,
        message: "Esta ação exige uma sessão MFA AAL2 válida. Verifique o autenticador e tente novamente.",
        mfaRequired: true,
      } satisfies SecurityActionResult,
    };
  }
  return { admin, denied: null };
}

function validateReason(formData: FormData): SecurityActionResult | null {
  const motivo = formText(formData, "motivo");
  if (motivo.length < 8) {
    return { ok: false, message: "Informe um motivo administrativo com pelo menos 8 caracteres." };
  }
  return null;
}

export async function desbloquearUsuarioSegurancaAction(formData: FormData): Promise<SecurityActionResult> {
  const invalidReason = validateReason(formData);
  if (invalidReason) return invalidReason;
  const auth = await requireSensitiveSecurityAction();
  if (auth.denied) return auth.denied;
  const admin = auth.admin;
  const userId = formText(formData, "userId");
  const tipoUsuario = formText(formData, "tipoUsuario") || "salao";
  const motivoAdmin = formText(formData, "motivo");
  if (!userId) return { ok: false, message: "Usuário não informado." };

  const supabase = getSupabaseAdmin();
  const { data: before, error: beforeError } = await supabase
    .from("user_security_status")
    .select("user_id, tipo_usuario, status, motivo, risco_atual, bloqueado_ate, verificacao_necessaria, atualizado_em")
    .eq("user_id", userId)
    .maybeSingle();
  if (beforeError || !before?.user_id) return { ok: false, message: "Não foi possível localizar o bloqueio deste usuário." };

  const now = new Date().toISOString();
  const after = { status: "ativo", motivo: null, risco_atual: "baixo", bloqueado_ate: null, verificacao_necessaria: false, atualizado_em: now };
  const { error } = await supabase.from("user_security_status").update(after).eq("user_id", userId);
  if (error) return { ok: false, message: "Não foi possível desbloquear este usuário." };

  await registrarAdminMasterAuditoria({
    idAdmin: admin.usuario.id,
    acao: "desbloquear_usuario_seguranca",
    entidade: "user_security_status",
    entidadeId: userId,
    descricao: motivoAdmin,
    payload: { motivo_admin: motivoAdmin, tipo_usuario: tipoUsuario, antes: before, depois: after },
  });
  void captureSystemEvent({ module: "security", eventType: "admin_master_desbloqueou_usuario", severity: "info", message: motivoAdmin, idUsuario: userId, idAdminUsuario: admin.usuario.id, origin: "server_action", route: "/admin-master/seguranca", success: true, createIncident: false, details: { tipoUsuario, adminEmail: admin.usuario.email, motivoAdmin } });
  revalidatePath("/admin-master/seguranca");
  revalidatePath("/admin-master/atividades");
  return { ok: true, message: "Usuário desbloqueado e alteração registrada na auditoria." };
}

export async function desbloquearSalaoSegurancaAction(formData: FormData): Promise<SecurityActionResult> {
  const invalidReason = validateReason(formData);
  if (invalidReason) return invalidReason;
  const auth = await requireSensitiveSecurityAction();
  if (auth.denied) return auth.denied;
  const admin = auth.admin;
  const idSalao = formText(formData, "idSalao");
  const motivoAdmin = formText(formData, "motivo");
  if (!idSalao) return { ok: false, message: "Salão não informado." };

  const supabase = getSupabaseAdmin();
  const { data: before, error: beforeError } = await supabase
    .from("saloes")
    .select("id, nome, status_seguranca, motivo_seguranca, bloqueado_ate")
    .eq("id", idSalao)
    .maybeSingle();
  if (beforeError || !before?.id) return { ok: false, message: "Não foi possível localizar este salão." };

  const after = { status_seguranca: "ativo", motivo_seguranca: null, bloqueado_ate: null };
  const { error } = await supabase.from("saloes").update(after).eq("id", idSalao);
  if (error) return { ok: false, message: "Não foi possível desbloquear este salão." };

  await registrarAdminMasterAuditoria({ idAdmin: admin.usuario.id, acao: "desbloquear_salao_seguranca", entidade: "saloes", entidadeId: idSalao, descricao: motivoAdmin, payload: { motivo_admin: motivoAdmin, antes: before, depois: after } });
  void captureSystemEvent({ module: "security", eventType: "admin_master_desbloqueou_salao", severity: "info", message: motivoAdmin, idSalao, idAdminUsuario: admin.usuario.id, origin: "server_action", route: "/admin-master/seguranca", success: true, createIncident: false, details: { adminEmail: admin.usuario.email, motivoAdmin } });
  revalidatePath("/admin-master/seguranca");
  revalidatePath("/admin-master/atividades");
  return { ok: true, message: "Salão reativado e alteração registrada na auditoria." };
}

export async function limparLogsSegurancaAction(formData: FormData): Promise<SecurityActionResult> {
  const invalidReason = validateReason(formData);
  if (invalidReason) return invalidReason;
  const auth = await requireSensitiveSecurityAction();
  if (auth.denied) return auth.denied;
  const admin = auth.admin;
  const motivoAdmin = formText(formData, "motivo");
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("security_login_attempts").delete().lt("criado_em", cutoff);
  if (error) return { ok: false, message: "Não foi possível aplicar a retenção dos logs de segurança." };

  await registrarAdminMasterAuditoria({ idAdmin: admin.usuario.id, acao: "limpar_logs_seguranca", entidade: "security_login_attempts", descricao: motivoAdmin, payload: { motivo_admin: motivoAdmin, antes: { politica: "logs anteriores a 30 dias presentes" }, depois: { cutoff_principal: cutoff, politica: "retenção de 30 dias aplicada" } } });
  void captureSystemEvent({ module: "security", eventType: "admin_master_limpeza_logs_seguranca", severity: "info", message: motivoAdmin, idAdminUsuario: admin.usuario.id, origin: "server_action", route: "/admin-master/seguranca", success: true, createIncident: false, details: { cutoff, motivoAdmin } });
  revalidatePath("/admin-master/seguranca");
  revalidatePath("/admin-master/atividades");
  return { ok: true, message: "Política de retenção aplicada e registrada na auditoria." };
}
