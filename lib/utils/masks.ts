export function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

export function maskCPF(value: string) {
  const v = onlyDigits(value).slice(0, 11);

  if (v.length <= 3) return v;
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9, 11)}`;
}

export function maskCEP(value: string) {
  const v = onlyDigits(value).slice(0, 8);
  if (v.length <= 5) return v;
  return `${v.slice(0, 5)}-${v.slice(5, 8)}`;
}

export function maskPhone(value: string) {
  const v = onlyDigits(value).slice(0, 11);

  if (v.length <= 2) return v;
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7, 11)}`;
}

export function maskDate(value: string) {
  const v = onlyDigits(value).slice(0, 8);

  if (v.length <= 2) return v;
  if (v.length <= 4) return `${v.slice(0, 2)}/${v.slice(2)}`;
  return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4, 8)}`;
}

export function dateBrToIso(value: string) {
  const clean = onlyDigits(value);
  if (clean.length !== 8) return "";
  const day = clean.slice(0, 2);
  const month = clean.slice(2, 4);
  const year = clean.slice(4, 8);
  return `${year}-${month}-${day}`;
}

export function dateIsoToBr(value?: string | null) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}