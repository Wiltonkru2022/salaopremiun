"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  CreditCard,
  LogOut,
  Menu,
  Percent,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getPainelPageMeta } from "@/components/layout/navigation";
import type { ResumoAssinatura } from "@/lib/assinatura-utils";
import NotificationBell from "@/components/layout/NotificationBell";
import type { ShellNotification } from "@/lib/notifications/contracts";

type Props = {
  userName?: string;
  userEmail?: string;
  nivel: string;
  salaoNome?: string;
  salaoResponsavel?: string;
  salaoLogoUrl?: string | null;
  planoNome?: string;
  assinaturaStatus?: string | null;
  resumoAssinatura?: ResumoAssinatura | null;
  canSeePerfilSalao: boolean;
  canSeeConfiguracoes: boolean;
  canSeeAssinatura: boolean;
  criticalNotificationsCount: number;
  notifications: ShellNotification[];
  notificationStorageKey?: string;
  scrolled: boolean;
  onOpenSidebar: () => void;
  onLogout: () => Promise<void>;
};

function getStatusTone(resumoAssinatura?: ResumoAssinatura | null) {
  if (!resumoAssinatura) {
    return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  }

  if (resumoAssinatura.bloqueioTotal) {
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }

  if (resumoAssinatura.vencendoLogo) {
    return "bg-amber-100 text-amber-700 ring-amber-200";
  }

  return "bg-emerald-100 text-emerald-700 ring-emerald-200";
}

function getStatusLabel(
  assinaturaStatus?: string | null,
  resumoAssinatura?: ResumoAssinatura | null
) {
  if (!assinaturaStatus) {
    return "Sem assinatura";
  }

  if (resumoAssinatura?.bloqueioTotal) {
    return "Bloqueada";
  }

  if (resumoAssinatura?.vencendoLogo) {
    return "Vence logo";
  }

  return assinaturaStatus.replace(/_/g, " ");
}

export default function Header({
  userName,
  userEmail,
  nivel,
  salaoNome,
  salaoResponsavel,
  salaoLogoUrl,
  planoNome,
  assinaturaStatus,
  resumoAssinatura,
  canSeePerfilSalao,
  canSeeConfiguracoes,
  canSeeAssinatura,
  criticalNotificationsCount,
  notifications,
  notificationStorageKey,
  scrolled,
  onOpenSidebar,
  onLogout,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pageMeta = useMemo(() => getPainelPageMeta(pathname), [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const initials = (userName || salaoNome || "SP").slice(0, 2);
  const showCriticalState = criticalNotificationsCount > 0;
  const showSubscriptionRisk =
    !showCriticalState &&
    Boolean(resumoAssinatura?.bloqueioTotal || resumoAssinatura?.vencendoLogo);

  return (
    <header
      className={clsx(
        "rounded-[14px] border px-2.5 py-2 transition-all duration-200 md:px-3",
        scrolled
          ? "border-zinc-200 bg-white/95 shadow-sm backdrop-blur"
          : "border-zinc-200 bg-white/92 backdrop-blur"
      )}
    >
      <div className="flex min-h-10 flex-wrap items-center gap-2 lg:flex-nowrap">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 lg:hidden"
          aria-label="Abrir menu lateral"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 flex-1 basis-[220px]">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate font-display text-[1rem] font-bold tracking-[-0.02em] text-zinc-950 sm:text-[1.05rem] xl:text-[1.2rem]">
              {pageMeta.title}
            </h1>
            <span className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 sm:inline-flex">
              {nivel}
            </span>
          </div>

          <p className="mt-0.5 hidden max-w-2xl truncate text-[11px] text-zinc-500 xl:block">
            {pageMeta.description}
          </p>
          {showCriticalState ? (
            <p className="mt-1 text-xs font-semibold text-rose-700">
              {criticalNotificationsCount} alerta(s) critico(s) pedem acao agora.
            </p>
          ) : showSubscriptionRisk ? (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              {resumoAssinatura?.bloqueioTotal
                ? "Assinatura com bloqueio ativo. Revise o status comercial agora."
                : "Assinatura vencendo em breve. Vale revisar cobranca e renovacao."}
            </p>
          ) : null}
        </div>

        <Link
          href={canSeeAssinatura ? "/meu-plano" : "#"}
          prefetch={canSeeAssinatura}
          aria-disabled={!canSeeAssinatura}
          className={clsx(
            "hidden min-w-0 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm md:flex xl:px-2.5",
            canSeeAssinatura
              ? "transition hover:border-zinc-300 hover:bg-white"
              : "pointer-events-none opacity-70"
          )}
        >
          <ShieldCheck size={16} className="shrink-0 text-[var(--app-accent-strong)]" />
          <span className="hidden truncate text-xs font-semibold text-zinc-900 xl:inline">
            {planoNome || "Sem plano"}
          </span>
          <span
            className={clsx(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
              getStatusTone(resumoAssinatura)
            )}
            >
            {getStatusLabel(assinaturaStatus, resumoAssinatura)}
          </span>
        </Link>

        <NotificationBell
          notifications={notifications}
          storageKey={notificationStorageKey}
          onOpenHelp={() => {}}
        />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-9 max-w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white py-1 pl-1 pr-1.5 text-left text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
            aria-label="Abrir menu da conta"
          >
              <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
              {salaoLogoUrl ? (
                <img
                  src={salaoLogoUrl}
                  alt={salaoNome || "Salao"}
                  className="h-full w-full object-cover"
                />
              ) : (
                  <span className="text-xs font-bold uppercase text-zinc-700">{initials}</span>
              )}
            </span>

            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[116px] truncate text-[13px] font-semibold xl:max-w-[144px]">
                {userName || "Usuario"}
              </span>
                  <span className="block max-w-[116px] truncate text-[10px] text-zinc-500 xl:max-w-[144px]">
                {salaoNome || userEmail || "Conta principal"}
              </span>
            </span>

            <ChevronDown
              size={16}
              className={clsx("transition-transform", menuOpen && "rotate-180")}
            />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,300px)] rounded-[18px] border border-zinc-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
              <div className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-4 text-zinc-950">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Perfil do salao
                </div>
                <div className="mt-2 truncate font-display text-xl font-bold">
                  {salaoNome || "SalaoPremium"}
                </div>
                <div className="mt-1 truncate text-sm text-zinc-500">
                  {salaoResponsavel || userEmail || "Conta administradora"}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {canSeePerfilSalao ? (
                  <Link
                    href="/perfil-salao"
                    prefetch={true}
                    onClick={() => setMenuOpen(false)}
                    onFocus={() => router.prefetch("/perfil-salao")}
                    onMouseEnter={() => router.prefetch("/perfil-salao")}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    <Building2 size={16} />
                    Perfil do salao
                  </Link>
                ) : null}

                {canSeeConfiguracoes ? (
                  <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 p-2">
                    <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                      Configuracoes
                    </div>

                    <Link
                      href="/configuracoes/usuarios"
                      prefetch={true}
                      onClick={() => setMenuOpen(false)}
                      onFocus={() => router.prefetch("/configuracoes/usuarios")}
                      onMouseEnter={() =>
                        router.prefetch("/configuracoes/usuarios")
                      }
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-white"
                    >
                      <Users size={16} />
                      Usuarios do sistema
                    </Link>

                    <Link
                      href="/configuracoes/caixa-taxas"
                      prefetch={true}
                      onClick={() => setMenuOpen(false)}
                      onFocus={() =>
                        router.prefetch("/configuracoes/caixa-taxas")
                      }
                      onMouseEnter={() =>
                        router.prefetch("/configuracoes/caixa-taxas")
                      }
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-white"
                    >
                      <Percent size={16} />
                      Caixa e taxas
                    </Link>

                    <Link
                      href="/configuracoes/agenda-horarios"
                      prefetch={true}
                      onClick={() => setMenuOpen(false)}
                      onFocus={() =>
                        router.prefetch("/configuracoes/agenda-horarios")
                      }
                      onMouseEnter={() =>
                        router.prefetch("/configuracoes/agenda-horarios")
                      }
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-white"
                    >
                      <CalendarClock size={16} />
                      Agenda e horarios
                    </Link>

                    <Link
                      href="/configuracoes/sistema"
                      prefetch={true}
                      onClick={() => setMenuOpen(false)}
                      onFocus={() =>
                        router.prefetch("/configuracoes/sistema")
                      }
                      onMouseEnter={() =>
                        router.prefetch("/configuracoes/sistema")
                      }
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-white"
                    >
                      <Settings size={16} />
                      Sistema
                    </Link>
                  </div>
                ) : null}

                {canSeeAssinatura ? (
                  <>
                    <Link
                      href="/meu-plano"
                      prefetch={true}
                      onClick={() => setMenuOpen(false)}
                      onFocus={() => router.prefetch("/meu-plano")}
                      onMouseEnter={() => router.prefetch("/meu-plano")}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      <CreditCard size={16} />
                      Meu plano
                    </Link>
                    <Link
                      href="/assinatura"
                      prefetch={true}
                      onClick={() => setMenuOpen(false)}
                      onFocus={() => router.prefetch("/assinatura")}
                      onMouseEnter={() => router.prefetch("/assinatura")}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      <CreditCard size={16} />
                      Assinatura
                    </Link>
                    <Link
                      href="/comparar-planos"
                      prefetch={true}
                      onClick={() => setMenuOpen(false)}
                      onFocus={() => router.prefetch("/comparar-planos")}
                      onMouseEnter={() => router.prefetch("/comparar-planos")}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      <CreditCard size={16} />
                      Comparar planos
                    </Link>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
