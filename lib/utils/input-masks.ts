import { maskCEP, maskCPF, maskDate, onlyDigits } from "@/lib/utils/masks";

export type InputMaskKind =
  | "cpf"
  | "cpf_cnpj"
  | "phone"
  | "cep"
  | "birthdate";

export type InputMaskMetadata = {
  name?: string | null;
  id?: string | null;
  placeholder?: string | null;
  autoComplete?: string | null;
  type?: string | null;
};

function normalizeKey(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function maskLocalPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function maskPhoneBr(value: string | null | undefined) {
  const digits = onlyDigits(String(value || "")).slice(0, 13);
  if (digits.startsWith("55") && digits.length > 11) {
    return `+55 ${maskLocalPhone(digits.slice(2))}`;
  }
  return maskLocalPhone(digits);
}

export function maskCpfCnpj(value: string | null | undefined) {
  const digits = onlyDigits(String(value || "")).slice(0, 14);
  if (digits.length <= 11) return maskCPF(digits);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function maskBirthDateValue(value: string | null | undefined) {
  const raw = String(value || "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return maskDate(raw);
}

export function detectInputMask(meta: InputMaskMetadata): InputMaskKind | null {
  const type = normalizeKey(meta.type);
  if (["hidden", "password", "email", "file", "checkbox", "radio"].includes(type)) {
    return null;
  }

  const strongKey = `${normalizeKey(meta.name)} ${normalizeKey(meta.id)}`.trim();
  const placeholder = normalizeKey(meta.placeholder);
  const autoComplete = normalizeKey(meta.autoComplete);

  if (/cpf[_-]?cnpj|cnpj[_-]?cpf|cpfcnpj/.test(strongKey)) return "cpf_cnpj";
  if (/(^|[^a-z])cpf([^a-z]|$)/.test(strongKey)) return "cpf";
  if (/(^|[^a-z])cep([^a-z]|$)|postal/.test(strongKey) || autoComplete === "postal-code") {
    return "cep";
  }
  if (/data[_-]?nascimento|datanascimento|nascimento|birth|bday/.test(strongKey) || autoComplete === "bday") {
    return "birthdate";
  }
  if (/telefone|whatsapp|celular|phone|mobile/.test(strongKey) || autoComplete === "tel") {
    return "phone";
  }

  if (/000\.000\.000-00/.test(placeholder)) return "cpf";
  if (/00\.000\.000\/0000-00/.test(placeholder)) return "cpf_cnpj";
  if (/dd\/mm\/aaaa|dd\/mm\/yyyy/.test(placeholder)) return "birthdate";
  if (/00000-000/.test(placeholder)) return "cep";
  if (!/e-?mail|email/.test(placeholder) && /\(00\)|whatsapp|celular/.test(placeholder)) {
    return "phone";
  }

  return null;
}

export function applyInputMask(kind: InputMaskKind, value: string) {
  switch (kind) {
    case "cpf":
      return maskCPF(value);
    case "cpf_cnpj":
      return maskCpfCnpj(value);
    case "phone":
      return maskPhoneBr(value);
    case "cep":
      return maskCEP(value);
    case "birthdate":
      return maskBirthDateValue(value);
  }
}

export function normalizeMaskedValue(kind: InputMaskKind, value: string) {
  if (kind === "birthdate") return value.trim();
  return onlyDigits(value);
}

export function maxLengthForMask(kind: InputMaskKind) {
  switch (kind) {
    case "cpf":
      return 14;
    case "cpf_cnpj":
      return 18;
    case "phone":
      return 19;
    case "cep":
      return 9;
    case "birthdate":
      return 10;
  }
}
