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

