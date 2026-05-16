import crypto from "node:crypto";

export const MFA_RECOVERY_DELAY_HOURS = 24;

export function generateMfaRecoveryCode() {
  const value = crypto.randomInt(1000, 10000);
  return `REC-${value}`;
}

export function buildMfaRecoverySubject(code: string) {
  return `Recuperação do autenticador - ${code}`;
}

export function buildMfaRecoveryMessage(code: string) {
  return [
    "Preciso recuperar o acesso ao autenticador desta conta.",
    "",
    `Código da solicitação: ${code}`,
    "",
    "Para seguir com segurança, envie nesta conversa:",
    "1. Uma selfie segurando o documento.",
    `2. Um papel com o código ${code} escrito à mão.`,
    "3. Um telefone ou e-mail de contato atual.",
    "",
    `Depois da aprovação, a remoção da proteção entra em carência de ${MFA_RECOVERY_DELAY_HOURS} horas por segurança.`,
  ].join("\n");
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export function buildMfaRecoveryApprovedMessage(params: {
  code: string;
  unlockAt: string;
}) {
  return [
    "Sua solicitação de recuperação do autenticador foi aprovada.",
    "",
    `Código da solicitação: ${params.code}`,
    `Por segurança, a liberação entra em carência até ${formatDateTime(params.unlockAt)}.`,
    "",
    "Se este pedido não foi feito por você, responda este ticket imediatamente.",
  ].join("\n");
}

export function buildMfaRecoveryRejectedMessage(params: { code: string }) {
  return [
    "Ainda não foi possível aprovar a recuperação do autenticador.",
    "",
    `Código da solicitação: ${params.code}`,
    "Envie novamente a selfie com o documento e o papel com o código escrito à mão para continuar a análise.",
  ].join("\n");
}

export function buildMfaRecoveryCompletedMessage(params: {
  code: string;
  lockUntil: string;
}) {
  return [
    "A recuperação do autenticador foi concluída.",
    "",
    `Código da solicitação: ${params.code}`,
    "Agora você pode configurar um novo autenticador no seu perfil.",
    `Por segurança, troca de senha e outras alterações sensíveis ficam bloqueadas até ${formatDateTime(params.lockUntil)}.`,
  ].join("\n");
}

export function buildMfaRecoveryEvidenceAcceptedMessage(params: {
  code: string;
}) {
  return [
    "Recebemos as evidências da recuperação do autenticador.",
    "",
    `Código da solicitação: ${params.code}`,
    "Os documentos ficaram marcados como completos e seguem para a etapa final de análise.",
  ].join("\n");
}

export function buildMfaRecoveryEvidenceIllegibleMessage(params: {
  code: string;
}) {
  return [
    "As evidências enviadas ainda não estão legíveis o suficiente para aprovar a recuperação.",
    "",
    `Código da solicitação: ${params.code}`,
    "Envie novamente a selfie e o documento com imagem mais nítida para continuar.",
  ].join("\n");
}

export function buildMfaRecoveryEvidenceDivergentMessage(params: {
  code: string;
}) {
  return [
    "Encontramos divergência entre os dados enviados e a conta da solicitação.",
    "",
    `Código da solicitação: ${params.code}`,
    "Responda este ticket com novas evidências e um contato atualizado para seguirmos com segurança.",
  ].join("\n");
}
