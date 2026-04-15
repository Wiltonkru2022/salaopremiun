type AttemptState = {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const globalStore = globalThis as typeof globalThis & {
  __profissionalLoginAttempts?: Map<string, AttemptState>;
};

function getStore() {
  if (!globalStore.__profissionalLoginAttempts) {
    globalStore.__profissionalLoginAttempts = new Map<string, AttemptState>();
  }

  return globalStore.__profissionalLoginAttempts;
}

function now() {
  return Date.now();
}

function formatRemaining(blockedUntil: number) {
  const remainingMs = Math.max(blockedUntil - now(), 0);
  const remainingMinutes = Math.ceil(remainingMs / 60000);

  return Math.max(remainingMinutes, 1);
}

function cleanupEntry(key: string, state: AttemptState) {
  const expiredWindow = now() - state.firstAttemptAt > WINDOW_MS;
  const blockEnded = !state.blockedUntil || state.blockedUntil <= now();

  if (expiredWindow && blockEnded) {
    getStore().delete(key);
    return true;
  }

  return false;
}

export function assertProfissionalLoginAllowed(key: string) {
  const state = getStore().get(key);
  if (!state) return;

  if (cleanupEntry(key, state)) {
    return;
  }

  if (state.blockedUntil && state.blockedUntil > now()) {
    const minutes = formatRemaining(state.blockedUntil);
    throw new Error(
      `Muitas tentativas de login. Aguarde ${minutes} minuto(s) antes de tentar novamente.`
    );
  }
}

export function registerProfissionalLoginFailure(key: string) {
  const store = getStore();
  const current = store.get(key);

  if (!current || cleanupEntry(key, current)) {
    store.set(key, {
      count: 1,
      firstAttemptAt: now(),
    });
    return;
  }

  const expiredWindow = now() - current.firstAttemptAt > WINDOW_MS;
  const nextCount = expiredWindow ? 1 : current.count + 1;

  const nextState: AttemptState = {
    count: nextCount,
    firstAttemptAt: expiredWindow ? now() : current.firstAttemptAt,
  };

  if (nextCount >= MAX_ATTEMPTS) {
    nextState.blockedUntil = now() + BLOCK_MS;
  }

  store.set(key, nextState);
}

export function clearProfissionalLoginFailures(key: string) {
  getStore().delete(key);
}
