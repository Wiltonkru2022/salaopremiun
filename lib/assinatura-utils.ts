export type ResumoAssinatura = {
  ativa: boolean;
  vencida: boolean;
  vencendoLogo: boolean;
  diasRestantes: number | null;
  diasAtraso: number | null;
  vencimentoEm: string | null;
  bloqueioTotal: boolean;
};

function diferencaEmDias(dataAlvo: Date, dataBase: Date) {
  const alvo = new Date(
    dataAlvo.getFullYear(),
    dataAlvo.getMonth(),
    dataAlvo.getDate()
  );

  const base = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    dataBase.getDate()
  );

  const diffMs = alvo.getTime() - base.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function parseDataVencimento(valor?: string | null) {
  if (!valor) return null;

  const texto = String(valor).trim();
  if (!texto) return null;

  if (texto.includes("T")) {
    const dataIso = new Date(texto);
    if (Number.isNaN(dataIso.getTime())) return null;
    return dataIso;
  }

  const dataFimDia = new Date(`${texto}T23:59:59`);
  if (Number.isNaN(dataFimDia.getTime())) return null;

  return dataFimDia;
}

type GetResumoAssinaturaParams = {
  status?: string | null;
  vencimentoEm?: string | null;
  trialFimEm?: string | null;
};

export function getResumoAssinatura({
  status,
  vencimentoEm,
  trialFimEm,
}: GetResumoAssinaturaParams): ResumoAssinatura {
  const statusNormalizado = String(status || "").toLowerCase();

  const vencimentoBase =
    ["teste_gratis", "trial", "trialing"].includes(statusNormalizado)
      ? trialFimEm || vencimentoEm || null
      : vencimentoEm || trialFimEm || null;

  if (!vencimentoBase) {
    return {
      ativa: false,
      vencida: true,
      vencendoLogo: false,
      diasRestantes: null,
      diasAtraso: null,
      vencimentoEm: null,
      bloqueioTotal: true,
    };
  }

  const vencimentoValido = parseDataVencimento(vencimentoBase);

  if (!vencimentoValido) {
    return {
      ativa: false,
      vencida: true,
      vencendoLogo: false,
      diasRestantes: null,
      diasAtraso: null,
      vencimentoEm: vencimentoBase,
      bloqueioTotal: true,
    };
  }

  const hoje = new Date();
  const diasRestantes = diferencaEmDias(vencimentoValido, hoje);
  const vencida = diasRestantes < 0;
  const diasAtraso = vencida ? Math.abs(diasRestantes) : 0;
  const vencendoLogo = !vencida && diasRestantes <= 3;

  if (["cancelada", "vencida"].includes(statusNormalizado)) {
    return {
      ativa: false,
      vencida: true,
      vencendoLogo: false,
      diasRestantes,
      diasAtraso,
      vencimentoEm: vencimentoBase,
      bloqueioTotal: true,
    };
  }

  if (["teste_gratis", "trial", "trialing"].includes(statusNormalizado)) {
    return {
      ativa: !vencida,
      vencida,
      vencendoLogo,
      diasRestantes: vencida ? 0 : diasRestantes,
      diasAtraso: vencida ? diasAtraso : 0,
      vencimentoEm: vencimentoBase,
      bloqueioTotal: vencida,
    };
  }

  if (["ativo", "ativa", "pago", "active", "paid"].includes(statusNormalizado)) {
    return {
      ativa: !vencida,
      vencida,
      vencendoLogo,
      diasRestantes: vencida ? 0 : diasRestantes,
      diasAtraso: vencida ? diasAtraso : 0,
      vencimentoEm: vencimentoBase,
      bloqueioTotal: vencida && diasAtraso > 3,
    };
  }

  if (["pendente", "aguardando_pagamento"].includes(statusNormalizado)) {
    return {
      ativa: !vencida,
      vencida,
      vencendoLogo,
      diasRestantes: vencida ? 0 : diasRestantes,
      diasAtraso: vencida ? diasAtraso : 0,
      vencimentoEm: vencimentoBase,
      bloqueioTotal: vencida && diasAtraso > 3,
    };
  }

  return {
    ativa: false,
    vencida: true,
    vencendoLogo: false,
    diasRestantes,
    diasAtraso,
    vencimentoEm: vencimentoBase,
    bloqueioTotal: true,
  };
}
