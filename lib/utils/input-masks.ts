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
  label?: string | null;
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
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function detectFromKey(value: string): InputMaskKind | null {
  if (/cpf[_-]?cnpj|cnpj[_-]?cpf|cpfcnpj/.test(value)) return "cpf_cnpj";
  if (/(^|[^a-z])cpf([^a-z]|$)/.test(value)) return "cpf";
  if (/(^|[^a-z])cep([^a-z]|$)|postal/.test(value)) return "cep";
  if (/data[_-]?nascimento|datanascimento|nascimento|birth|bday/.test(value)) {
    return "birthdate";
  }
  if (/telefone|whatsapp|celular|phone|mobile/.test(value)) return "phone";
  return null;
}

export function detectInputMask(meta: InputMaskMetadata): InputMaskKind | null {
  const type = normalizeKey(meta.type);
  if (["hidden", "password", "email", "file", "checkbox", "radio"].includes(type)) {
    return null;
  }

  const structuralKey = `${normalizeKey(meta.name)} ${normalizeKey(meta.id)}`.trim();
  const label = normalizeKey(meta.label);
  const placeholder = normalizeKey(meta.placeholder);
  const autoComplete = normalizeKey(meta.autoComplete);

  const structuralKind = detectFromKey(structuralKey);
  if (structuralKind) return structuralKind;
  if (autoComplete === "postal-code") return "cep";
  if (autoComplete === "bday") return "birthdate";
  if (autoComplete === "tel") return "phone";

  if (label.includes("cpf") && label.includes("cnpj")) return "cpf_cnpj";
  if (/(^|[^a-z])cpf([^a-z]|$)/.test(label)) return "cpf";
  if (/(^|[^a-z])cep([^a-z]|$)|postal/.test(label)) return "cep";
  if (/data de nascimento|nascimento|birth|bday/.test(label)) return "birthdate";
  if (
    /telefone|whatsapp|celular|phone|mobile/.test(label) &&
    !/e-?mail|email/.test(label)
  ) {
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

export function maskBirthDateValue(value: string | null | undefined) {
  const raw = String(value || "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return maskDate(raw);
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
