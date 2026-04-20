import { getSupabaseAdmin } from "@/lib/supabase/admin";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CaixaInputError extends Error {
  status = 400;
}

export function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

export function sanitizeText(value: unknown) {
  const parsed = String(value || "").trim();
  return parsed || null;
}

export function sanitizeIdempotencyKey(value: unknown) {
  const parsed = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 160);

  return parsed || null;
}

export function sanitizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

export function sanitizeInteger(value: unknown, fallback = 1) {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveHttpStatus(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

export function isMissingRpcFunction(error: unknown, functionName: string) {
  const candidate = error as { code?: string; message?: string } | null;
  const message = String(candidate?.message || "").toLowerCase();

  return (
    candidate?.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes(`function public.${functionName.toLowerCase()}`)
  );
}

export async function carregarComandaBase(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idComanda: string;
}) {
  const { supabaseAdmin, idSalao, idComanda } = params;

  const { data: comanda, error } = await supabaseAdmin
    .from("comandas")
    .select("id, id_salao, id_cliente, numero, status")
    .eq("id", idComanda)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) throw error;

  if (!comanda?.id) {
    throw new Error("Comanda nao encontrada para este salao.");
  }

  return comanda;
}

export async function carregarSessaoAberta(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  idSalao: string
) {
  const { data: sessao, error } = await supabaseAdmin
    .from("caixa_sessoes")
    .select("id, status")
    .eq("id_salao", idSalao)
    .eq("status", "aberto")
    .order("aberto_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!sessao?.id) {
    throw new Error("Abra o caixa antes de vender, receber ou finalizar comanda.");
  }

  return sessao;
}
