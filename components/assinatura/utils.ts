export function formatarMoeda(valor?: number | null) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarData(valor?: string | null) {
  if (!valor) return "-";

  const texto = String(valor).trim();
  if (!texto) return "-";

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const dataLocal = new Date(`${texto}T12:00:00`);
    if (Number.isNaN(dataLocal.getTime())) return "-";
    return dataLocal.toLocaleDateString("pt-BR");
  }

  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return "-";

  return data.toLocaleDateString("pt-BR");
}

export function formatarDataHora(valor?: string | null) {
  if (!valor) return "-";

  const texto = String(valor).trim();
  if (!texto) return "-";

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const dataLocal = new Date(`${texto}T12:00:00`);
    if (Number.isNaN(dataLocal.getTime())) return "-";
    return dataLocal.toLocaleString("pt-BR");
  }

  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return "-";

  return data.toLocaleString("pt-BR");
}

export function formatarNumeroCartao(valor: string) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

export function formatarMes(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 2);
}

export function formatarAno(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 4);
}

export function formatarCvv(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 4);
}

export function getStatusLabel(status?: string | null) {
  const s = String(status || "").toLowerCase();

  if (s === "teste_gratis" || s === "trial") return "Teste grátis";
  if (s === "ativo" || s === "ativa" || s === "pago") return "Ativa";
  if (s === "pendente" || s === "aguardando_pagamento") return "Pagamento pendente";
  if (s === "cancelada") return "Cancelada";
  if (s === "vencida") return "Vencida";

  return "Sem assinatura";
}

export function getStatusBadgeClass(status?: string | null) {
  const s = String(status || "").toLowerCase();

  if (s === "teste_gratis" || s === "trial") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (s === "ativo" || s === "ativa" || s === "pago") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (s === "pendente" || s === "aguardando_pagamento") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

export function getFormaPagamentoLabel(forma?: string | null) {
  const s = String(forma || "").toUpperCase();

  if (s === "PIX") return "PIX";
  if (s === "BOLETO") return "Boleto";
  if (s === "CREDIT_CARD") return "Cartão";

  return "-";
}

export function isStatusTrial(status?: string | null) {
  const s = String(status || "").toLowerCase();
  return s === "teste_gratis" || s === "trial";
}