"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import GuidedOnboarding from "@/components/layout/GuidedOnboarding";
import MonitoringContextBridge from "@/components/monitoring/MonitoringContextBridge";
import type { Permissoes } from "@/components/layout/navigation";
import type { ResumoAssinatura } from "@/lib/assinatura-utils";
import type {
  ShellNotification,
  ShellNotificationsResponse,
} from "@/lib/notifications/contracts";
import {
  getPainelOnboardingModuleId,
  getPainelOnboardingStepIndexForPath,
  getPainelOnboardingSteps,
  type PainelOnboardingSnapshot,
} from "@/lib/onboarding/painel-guide";
import { createClient } from "@/lib/supabase/client";
import {
  captureClientError,
  monitorClientOperation,
} from "@/lib/monitoring/client";
import {
  buildPainelOnboardingStorageKey,
  markOnboardingModuleVisited,
  readOnboardingState,
  writeOnboardingState,
} from "@/lib/onboarding/storage";

type Props = {
  children: React.ReactNode;
  idSalao?: string;
  idUsuario?: string;
  userName?: string;
  userEmail?: string;
  permissoes: Permissoes;
  nivel: string;
  salaoNome?: string;
  salaoResponsavel?: string;
  salaoLogoUrl?: string | null;
  planoNome?: string;
  assinaturaStatus?: string | null;
  resumoAssinatura?: ResumoAssinatura | null;
  onboarding?: PainelOnboardingSnapshot | null;
  notifications?: ShellNotification[];
};

export default function AppShell({
  children,
  idSalao,
  idUsuario,
  userName,
  userEmail,
  permissoes,
  nivel,
  salaoNome,
  salaoResponsavel,
  salaoLogoUrl,
  planoNome,
  assinaturaStatus,
  resumoAssinatura,
  onboarding,
  notifications = [],
}: Props) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [contentScrolled, setContentScrolled] = useState(false);
  const [shellNotifications, setShellNotifications] = useState(notifications);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storageScope = [idSalao, idUsuario].filter(Boolean).join(":");
  const onboardingStorageKey = buildPainelOnboardingStorageKey({
    idSalao,
    idUsuario,
  });
  const notificationStorageKey = storageScope || undefined;
  const onboardingSteps = getPainelOnboardingSteps(
    Boolean(permissoes?.assinatura_ver)
  );
  const currentModuleId = getPainelOnboardingModuleId(pathname);
  const criticalNotificationsCount = shellNotifications.filter(
    (notification) => notification.critical
  ).length;

  useEffect(() => {
    setShellNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    let active = true;

    async function loadShellNotifications() {
      try {
        const response = await monitorClientOperation(
          {
            module: "shell",
            action: "carregar_notificacoes",
            route: "/api/shell-notifications",
            screen: "painel_shell",
            successMessage: "Notificacoes do shell atualizadas.",
            errorMessage: "Falha ao carregar notificacoes do shell.",
          },
          () =>
            fetch("/api/shell-notifications", {
              cache: "no-store",
            })
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as Partial<ShellNotificationsResponse>;

        if (active && Array.isArray(data.notifications)) {
          setShellNotifications(data.notifications);
        }
      } catch (error) {
        console.error("Erro ao carregar notificacoes do painel:", error);
        void captureClientError({
          module: "shell",
          action: "carregar_notificacoes",
          screen: "painel_shell",
          error,
          fallbackMessage: "Erro ao carregar notificacoes do painel.",
        });
      }
    }

    void loadShellNotifications();

    return () => {
      active = false;
    };
  }, [notifications]);

  useEffect(() => {
    if (!onboardingStorageKey) return;

    const current = readOnboardingState(onboardingStorageKey);
    const contextualStep = getPainelOnboardingStepIndexForPath(
      pathname,
      onboardingSteps
    );
    const nextStep =
      current.lastModuleId === currentModuleId
        ? Number(current.stepIndex || 0)
        : contextualStep;

    setGuideStep(Math.max(0, Math.min(nextStep, onboardingSteps.length - 1)));
    markOnboardingModuleVisited(onboardingStorageKey, currentModuleId);

    if (searchParams.get("tour") === "1") {
      setGuideOpen(true);
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("tour");
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
      return;
    }

    if (!current.completedAt && !current.dismissedAt && onboardingSteps.length > 0) {
      setGuideOpen(true);
    }
  }, [
    currentModuleId,
    onboardingStorageKey,
    onboardingSteps,
    pathname,
    router,
    searchParams,
  ]);

  async function handleLogout() {
    await monitorClientOperation(
      {
        module: "auth",
        action: "logout",
        screen: "painel_shell",
        successMessage: "Logout executado com sucesso.",
        errorMessage: "Falha ao encerrar sessao.",
      },
      async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login?motivo=logout");
        router.refresh();
      }
    );
  }

  function handleOpenHelp() {
    const contextualStep = getPainelOnboardingStepIndexForPath(
      pathname,
      onboardingSteps
    );
    setGuideStep(contextualStep);
    setGuideOpen(true);

    if (!onboardingStorageKey) return;

    const current = readOnboardingState(onboardingStorageKey);
    writeOnboardingState(onboardingStorageKey, {
      ...current,
      stepIndex: contextualStep,
      lastModuleId: currentModuleId,
      dismissedAt: null,
    });
  }

  function handleCloseGuide() {
    setGuideOpen(false);
  }

  function handleSkipGuide() {
    if (onboardingStorageKey) {
      writeOnboardingState(onboardingStorageKey, {
        stepIndex: guideStep,
        dismissedAt: new Date().toISOString(),
      });
    }

    setGuideOpen(false);
  }

  function handleGuideStepChange(nextStep: number) {
    const clamped = Math.max(0, Math.min(nextStep, onboardingSteps.length - 1));
    setGuideStep(clamped);

    if (onboardingStorageKey) {
      const current = readOnboardingState(onboardingStorageKey);
      writeOnboardingState(onboardingStorageKey, {
        ...current,
        stepIndex: clamped,
      });
    }
  }

  function handleFinishGuide() {
    if (onboardingStorageKey) {
      writeOnboardingState(onboardingStorageKey, {
        stepIndex: onboardingSteps.length - 1,
        completedAt: new Date().toISOString(),
        dismissedAt: null,
      });
    }

    setGuideOpen(false);
  }

  return (
    <div className="min-h-screen bg-white text-[var(--app-ink)]">
      <MonitoringContextBridge
        actorType="usuario_salao"
        surface="painel"
        idSalao={idSalao || null}
        idUsuario={idUsuario || null}
      />

      <div className="relative flex min-h-screen">
        <Sidebar
          permissoes={permissoes}
          nivel={nivel}
          salaoNome={salaoNome}
          salaoResponsavel={salaoResponsavel}
          salaoLogoUrl={salaoLogoUrl}
          planoNome={planoNome}
          resumoAssinatura={resumoAssinatura}
          canSeeAssinatura={Boolean(permissoes?.assinatura_ver)}
          criticalNotificationsCount={criticalNotificationsCount}
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          onLogout={handleLogout}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30 bg-white px-3 pb-2 pt-2 sm:px-5">
            <Header
              userName={userName}
              userEmail={userEmail}
              nivel={nivel}
              salaoNome={salaoNome}
              salaoResponsavel={salaoResponsavel}
              salaoLogoUrl={salaoLogoUrl}
              planoNome={planoNome}
              assinaturaStatus={assinaturaStatus}
              resumoAssinatura={resumoAssinatura}
              canSeePerfilSalao={Boolean(permissoes?.perfil_salao_ver)}
              canSeeConfiguracoes={Boolean(permissoes?.configuracoes_ver)}
              canSeeAssinatura={Boolean(permissoes?.assinatura_ver)}
              criticalNotificationsCount={criticalNotificationsCount}
              notifications={shellNotifications}
              notificationStorageKey={notificationStorageKey}
              scrolled={contentScrolled}
              onOpenHelp={handleOpenHelp}
              onOpenSidebar={() => setMobileSidebarOpen(true)}
              onLogout={handleLogout}
            />
          </div>

          <main
            className="scroll-premium min-h-0 flex-1 overflow-y-auto bg-white px-3 pb-5 sm:px-5"
            onScroll={(event) => {
              const nextScrolled = event.currentTarget.scrollTop > 12;
              setContentScrolled((current) =>
                current === nextScrolled ? current : nextScrolled
              );
            }}
          >
            <div className="min-h-[calc(100vh-6.5rem)] bg-white p-4 sm:p-6">
              <div className="min-w-0">{children}</div>
            </div>
          </main>
        </div>
      </div>

      <GuidedOnboarding
        open={guideOpen}
        pathname={pathname}
        stepIndex={guideStep}
        steps={onboardingSteps}
        snapshot={onboarding}
        onClose={handleCloseGuide}
        onBack={() => handleGuideStepChange(guideStep - 1)}
        onNext={() => handleGuideStepChange(guideStep + 1)}
        onOpenStep={(href) => {
          router.push(href);
        }}
        onSkip={handleSkipGuide}
        onFinish={handleFinishGuide}
      />
    </div>
  );
}
