"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import type { Permissoes } from "@/components/layout/navigation";
import type { ShellNotification } from "@/components/layout/NotificationBell";
import type { ResumoAssinatura } from "@/lib/assinatura-utils";
import { createClient } from "@/lib/supabase/client";

type Props = {
  children: React.ReactNode;
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
  notifications?: ShellNotification[];
};

export default function AppShell({
  children,
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
  notifications = [],
}: Props) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [contentScrolled, setContentScrolled] = useState(false);
  const [shellNotifications, setShellNotifications] = useState(notifications);
  const router = useRouter();

  useEffect(() => {
    setShellNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    let active = true;

    async function loadShellNotifications() {
      try {
        const response = await fetch("/api/shell-notifications", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          notifications?: ShellNotification[];
        };

        if (active && Array.isArray(data.notifications)) {
          setShellNotifications(data.notifications);
        }
      } catch (error) {
        console.error("Erro ao carregar notificacoes do painel:", error);
      }
    }

    void loadShellNotifications();

    return () => {
      active = false;
    };
  }, [notifications]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white text-[var(--app-ink)]">
      <div className="relative flex min-h-screen">
        <Sidebar
          permissoes={permissoes}
          nivel={nivel}
          salaoNome={salaoNome}
          salaoResponsavel={salaoResponsavel}
          salaoLogoUrl={salaoLogoUrl}
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
              notifications={shellNotifications}
              scrolled={contentScrolled}
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
    </div>
  );
}
