import { runAdminOperation } from "@/lib/supabase/admin-ops";

type AttemptStateRow = {
  chave: string;
  tentativas: number;
  primeira_tentativa_em: string;
  bloqueado_ate: string | null;
  atualizado_em?: string;
};

type AdminOperationResult<TData = unknown> = {
  data?: TData;
  error: { message?: string } | null;
};

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function nowMs() {
  return Date.now();
}

function toIso(dateMs: number) {
  return new Date(dateMs).toISOString();
}

function parseDateMs(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function formatRemaining(blockedUntilMs: number) {
  const remainingMs = Math.max(blockedUntilMs - nowMs(), 0);
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  return Math.max(remainingMinutes, 1);
}

function isWindowExpired(firstAttemptAtMs: number) {
  return nowMs() - firstAttemptAtMs > WINDOW_MS;
}

async function getState(key: string): Promise<AttemptStateRow | null> {
  const { data, error } = await runAdminOperation<
    AdminOperationResult<AttemptStateRow | null>
  >({
    action: "profissional_login_rate_limit_get_state",
    run: async (supabaseAdmin) => {
      const result = await supabaseAdmin
        .from("profissional_login_rate_limits")
        .select(
          "chave, tentativas, primeira_tentativa_em, bloqueado_ate, atualizado_em"
        )
        .eq("chave", key)
        .maybeSingle();
      return {
        data: (result.data as AttemptStateRow | null) ?? null,
        error: result.error,
      };
    },
  });

  if (error) {
    throw new Error("Nao foi possivel consultar o limite de tentativas.");
  }

  return (data as AttemptStateRow | null) ?? null;
}

async function deleteState(key: string) {
  const { error } = await runAdminOperation<AdminOperationResult>({
    action: "profissional_login_rate_limit_delete_state",
    run: async (supabaseAdmin) => {
      const result = await supabaseAdmin
        .from("profissional_login_rate_limits")
        .delete()
        .eq("chave", key);
      return {
        error: result.error,
      };
    },
  });

  if (error) {
    throw new Error("Nao foi possivel limpar o limite de tentativas.");
  }
}

async function upsertState(state: AttemptStateRow) {
  const { error } = await runAdminOperation<AdminOperationResult>({
    action: "profissional_login_rate_limit_upsert_state",
    run: async (supabaseAdmin) => {
      const result = await supabaseAdmin.from("profissional_login_rate_limits").upsert(state, {
        onConflict: "chave",
      });
      return {
        error: result.error,
      };
    },
  });

  if (error) {
    throw new Error("Nao foi possivel registrar a tentativa de login.");
  }
}

async function cleanupEntry(key: string, state: AttemptStateRow) {
  const firstAttemptAtMs = parseDateMs(state.primeira_tentativa_em);
  const blockedUntilMs = parseDateMs(state.bloqueado_ate);
  const expiredWindow = firstAttemptAtMs ? isWindowExpired(firstAttemptAtMs) : true;
  const blockEnded = !blockedUntilMs || blockedUntilMs <= nowMs();

  if (expiredWindow && blockEnded) {
    await deleteState(key);
    return true;
  }

  return false;
}

export async function assertProfissionalLoginAllowed(key: string) {
  const state = await getState(key);
  if (!state) return;

  if (await cleanupEntry(key, state)) {
    return;
  }

  const blockedUntilMs = parseDateMs(state.bloqueado_ate);
  if (blockedUntilMs && blockedUntilMs > nowMs()) {
    const minutes = formatRemaining(blockedUntilMs);
    throw new Error(
      `Muitas tentativas de login. Aguarde ${minutes} minuto(s) antes de tentar novamente.`
    );
  }
}

export async function registerProfissionalLoginFailure(key: string) {
  const current = await getState(key);

  if (!current || (await cleanupEntry(key, current))) {
    await upsertState({
      chave: key,
      tentativas: 1,
      primeira_tentativa_em: toIso(nowMs()),
      bloqueado_ate: null,
    });
    return;
  }

  const firstAttemptAtMs = parseDateMs(current.primeira_tentativa_em) ?? nowMs();
  const expiredWindow = isWindowExpired(firstAttemptAtMs);
  const nextCount = expiredWindow ? 1 : Number(current.tentativas || 0) + 1;
  const nextFirstAttemptAt = expiredWindow ? nowMs() : firstAttemptAtMs;

  await upsertState({
    chave: key,
    tentativas: nextCount,
    primeira_tentativa_em: toIso(nextFirstAttemptAt),
    bloqueado_ate: nextCount >= MAX_ATTEMPTS ? toIso(nowMs() + BLOCK_MS) : null,
  });
}

export async function clearProfissionalLoginFailures(key: string) {
  await deleteState(key);
}
