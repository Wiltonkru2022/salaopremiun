export type ClienteEntity = {
  id?: string;
  id_salao: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  observacoes?: string | null;
  origem?: string | null;
  ativo?: boolean | null;
};

export type ClienteContatoNormalizado = {
  telefone?: string | null;
  email?: string | null;
};

export function normalizarEmailCliente(email?: string | null) {
  const value = String(email || "").trim().toLowerCase();
  return value || null;
}

export function normalizarTelefoneCliente(telefone?: string | null) {
  const digits = String(telefone || "").replace(/\D/g, "");
  return digits || null;
}
