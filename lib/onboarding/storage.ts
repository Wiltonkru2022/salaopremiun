"use client";

export type OnboardingModuleState = {
  openedAt?: string | null;
  lastVisitedAt?: string | null;
};

export type OnboardingState = {
  stepIndex: number;
  dismissedAt?: string | null;
  completedAt?: string | null;
  lastModuleId?: string | null;
  modules?: Record<string, OnboardingModuleState>;
};

function sanitizeScopePart(value?: string | null) {
  return String(value || "").trim();
}

export function buildPainelOnboardingStorageKey(params: {
  idSalao?: string | null;
  idUsuario?: string | null;
}) {
  const idSalao = sanitizeScopePart(params.idSalao);
  const idUsuario = sanitizeScopePart(params.idUsuario);

  if (!idSalao || !idUsuario) {
    return null;
  }

  return `salaopremium:onboarding:painel:${idSalao}:${idUsuario}`;
}

export function readOnboardingState(storageKey: string): OnboardingState {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return { stepIndex: 0, modules: {} };
    }

    const parsed = JSON.parse(raw) as Partial<OnboardingState>;

    return {
      stepIndex: Number(parsed.stepIndex || 0),
      dismissedAt:
        typeof parsed.dismissedAt === "string" ? parsed.dismissedAt : null,
      completedAt:
        typeof parsed.completedAt === "string" ? parsed.completedAt : null,
      lastModuleId:
        typeof parsed.lastModuleId === "string" ? parsed.lastModuleId : null,
      modules:
        parsed.modules && typeof parsed.modules === "object" ? parsed.modules : {},
    };
  } catch {
    return { stepIndex: 0, modules: {} };
  }
}

export function writeOnboardingState(
  storageKey: string,
  partial: Partial<OnboardingState>
) {
  const current = readOnboardingState(storageKey);
  const next: OnboardingState = {
    ...current,
    ...partial,
    stepIndex: Number(partial.stepIndex ?? current.stepIndex ?? 0),
    modules: {
      ...(current.modules || {}),
      ...(partial.modules || {}),
    },
  };

  window.localStorage.setItem(storageKey, JSON.stringify(next));
}

export function markOnboardingModuleVisited(
  storageKey: string,
  moduleId: string,
  openedAt?: string
) {
  const current = readOnboardingState(storageKey);
  const currentModule = current.modules?.[moduleId] || {};
  const timestamp = openedAt || new Date().toISOString();

  writeOnboardingState(storageKey, {
    lastModuleId: moduleId,
    modules: {
      ...(current.modules || {}),
      [moduleId]: {
        openedAt: currentModule.openedAt || timestamp,
        lastVisitedAt: timestamp,
      },
    },
  });
}
