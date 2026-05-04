import crypto from "node:crypto";

export const MFA_RECOVERY_DELAY_HOURS = 24;

export function generateMfaRecoveryCode() {
  const value = crypto.randomInt(1000, 10000);
  return `REC-${value}`;
}

export function buildMfaRecoverySubject(code: string) {
  return `Recuperacao do autenticador - ${code}`;
}

export function buildMfaRecoveryMessage(code: string) {
  return [
    "Preciso recuperar o acesso ao autenticador desta conta.",
    "",
    `Codigo da solicitacao: ${code}`,
    "",
    "Para seguir com seguranca, envie nesta conversa:",
    "1. Uma selfie segurando o documento.",
    `2. Um papel com o codigo ${code} escrito a mao.`,
    "3. Um telefone ou e-mail de contato atual.",
    "",
    `Depois da aprovacao, a remocao da protecao entra em carencia de ${MFA_RECOVERY_DELAY_HOURS} horas por seguranca.`,
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
    "Sua solicitacao de recuperacao do autenticador foi aprovada.",
    "",
    `Codigo da solicitacao: ${params.code}`,
    `Por seguranca, a liberacao entra em carencia ate ${formatDateTime(params.unlockAt)}.`,
    "",
    "Se este pedido nao foi feito por voce, responda este ticket imediatamente.",
  ].join("\n");
}

export function buildMfaRecoveryRejectedMessage(params: { code: string }) {
  return [
    "Ainda nao foi possivel aprovar a recuperacao do autenticador.",
    "",
    `Codigo da solicitacao: ${params.code}`,
    "Envie novamente a selfie com o documento e o papel com o codigo escrito a mao para continuar a analise.",
  ].join("\n");
}

export function buildMfaRecoveryCompletedMessage(params: {
  code: string;
  lockUntil: string;
}) {
  return [
    "A recuperacao do autenticador foi concluida.",
    "",
    `Codigo da solicitacao: ${params.code}`,
    "Agora voce pode configurar um novo autenticador no seu perfil.",
    `Por seguranca, troca de senha e outras alteracoes sensiveis ficam bloqueadas ate ${formatDateTime(params.lockUntil)}.`,
  ].join("\n");
}

export function buildMfaRecoveryEvidenceAcceptedMessage(params: {
  code: string;
}) {
  return [
    "Recebemos as evidencias da recuperacao do autenticador.",
    "",
    `Codigo da solicitacao: ${params.code}`,
    "Os documentos ficaram marcados como completos e seguem para a etapa final de analise.",
  ].join("\n");
}

export function buildMfaRecoveryEvidenceIllegibleMessage(params: {
  code: string;
}) {
  return [
    "As evidencias enviadas ainda nao estao legiveis o suficiente para aprovar a recuperacao.",
    "",
    `Codigo da solicitacao: ${params.code}`,
    "Envie novamente a selfie e o documento com imagem mais nitida para continuar.",
  ].join("\n");
}

export function buildMfaRecoveryEvidenceDivergentMessage(params: {
  code: string;
}) {
  return [
    "Encontramos divergencia entre os dados enviados e a conta da solicitacao.",
    "",
    `Codigo da solicitacao: ${params.code}`,
    "Responda este ticket com novas evidencias e um contato atualizado para seguirmos com seguranca.",
  ].join("\n");
}
