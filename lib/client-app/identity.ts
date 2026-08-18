export function normalizeCpf(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

export function isValidCpf(value: string | null | undefined) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += digits[i] * (10 - i);
  let first = (sum * 10) % 11;
  if (first === 10) first = 0;
  if (first !== digits[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += digits[i] * (11 - i);
  let second = (sum * 10) % 11;
  if (second === 10) second = 0;
  return second === digits[10];
}

export function maskCpf(value: string | null | undefined) {
  const cpf = normalizeCpf(value);
  return cpf
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function parseClienteBirthDate(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  let iso = raw;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (br) iso = `${br[3]}-${br[2]}-${br[1]}`;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  if (date.getTime() > todayUtc.getTime()) return null;
  return iso;
}

export function maskBirthDate(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizeWhatsapp(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "").trim();
}

export function normalizeClienteEmail(value: string | null | undefined) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
