"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  CreditCard,
  Loader2,
  LogOut,
  Menu,
  ReceiptText,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { getPainelPageMeta } from "@/components/layout/navigation";
import type { ResumoAssinatura } from "@/lib/assinatura-utils";
import NotificationBell from "@/components/layout/NotificationBell";
import type { ShellNotification } from "@/lib/notifications/contracts";
import { getAssinaturaUrl, getPainelUrl } from "@/lib/site-urls";

type SearchResultType = "cliente" | "agendamento" | "comanda" | "servico";

type TopbarSearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  description: string;
  href: string;
};

const SEARCH_TYPE_META: Record<
  SearchResultType,
  {
    label: string;
    icon: typeof Users;
    className: string;
  }
> = {
  cliente: {
    label: "Cliente",
    icon: Users,
    className: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  agendamento: {
    label: "Agenda",
    icon: CalendarClock,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  comanda: {
    label: "Comanda",
    icon: ReceiptText,
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  servico: {
    label: "Serviço",
    icon: Scissors,
    className: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
  },
};

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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TopbarSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const pageMeta = useMemo(() => getPainelPageMeta(pathname), [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError("");
        const response = await fetch(
          `/api/painel/busca-global?q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
            headers: {
              accept: "application/json",
            },
          }
        );
        const payload = (await response.json()) as {
          results?: TopbarSearchResult[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Não foi possível buscar agora.");
        }

        setSearchResults(payload.results || []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSearchError(
          error instanceof Error ? error.message : "Não foi possível buscar agora."
        );
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [searchQuery]);

  const initials = (userName || salaoNome || "SP").slice(0, 2);
  const showCriticalState = criticalNotificationsCount > 0;
  const showSubscriptionRisk =
    !showCriticalState &&
    Boolean(resumoAssinatura?.bloqueioTotal || resumoAssinatura?.vencendoLogo);

  const goToSearchResult = (result: TopbarSearchResult) => {
    setSearchOpen(false);
    setSearchQuery("");
    window.location.assign(getRouteHref(result.href));
  };

  return (
    <header
      className={clsx(
        "border-b border-zinc-200 bg-white px-3 py-2.5 transition-all duration-200 md:px-4",
        scrolled
          ? "shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
          : "shadow-[0_1px_0_rgba(15,23,42,0.02)]"
      )}
    >
      <div className="flex min-h-10 flex-wrap items-center gap-3 lg:flex-nowrap">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 lg:hidden"
          aria-label="Abrir menu lateral"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 flex-1 basis-[170px] overflow-hidden lg:max-w-[300px] xl:max-w-[340px]">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate font-display text-[0.98rem] font-bold tracking-[-0.02em] text-zinc-950 sm:text-[1rem] xl:text-[1.08rem]">
              {pageMeta.title}
            </h1>
            <span className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 sm:inline-flex">
              {nivel}
            </span>
          </div>

          <p className="mt-0.5 hidden max-w-2xl truncate text-[11px] text-zinc-500 2xl:block">
            {pageMeta.description}
          </p>
          {showCriticalState ? (
            <p className="mt-1 text-xs font-semibold text-rose-700">
              {criticalNotificationsCount} alerta(s) crítico(s) pedem ação agora.
            </p>
          ) : showSubscriptionRisk ? (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              {resumoAssinatura?.bloqueioTotal
                ? "Assinatura com bloqueio ativo. Revise o status comercial agora."
                : "Assinatura vencendo em breve. Vale revisar cobrança e renovação."}
            </p>
          ) : null}
        </div>

        <div
          ref={searchRef}
          className="relative hidden min-w-[320px] max-w-[720px] flex-[1.6] xl:block"
        >
          <div
            className={clsx(
              "flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-sm shadow-inner transition",
              searchOpen
                ? "border-zinc-900 ring-4 ring-zinc-100"
                : "border-zinc-200 hover:border-zinc-300"
            )}
          >
            <Search size={16} className="shrink-0 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchOpen(false);
                }
                if (event.key === "Enter" && searchResults[0]) {
                  event.preventDefault();
                  goToSearchResult(searchResults[0]);
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
              placeholder="Busca avançada: cliente, horário, comanda ou serviço"
              aria-label="Busca avançada do painel"
            />
            {searchLoading ? (
              <Loader2 size={15} className="shrink-0 animate-spin text-zinc-400" />
            ) : (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                Enter
              </span>
            )}
          </div>
          {searchOpen && searchQuery.trim().length > 0 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-50 overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
              <div className="border-b border-zinc-100 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  <Sparkles size={13} />
                  Busca avançada
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Abra clientes, agendamentos, comandas e serviços sem sair do fluxo.
                </p>
              </div>

              {searchQuery.trim().length < 2 ? (
                <div className="px-4 py-5 text-sm text-zinc-500">
                  Digite pelo menos 2 caracteres para buscar.
                </div>
              ) : searchError ? (
                <div className="px-4 py-5 text-sm font-semibold text-rose-700">
                  {searchError}
                </div>
              ) : searchLoading && searchResults.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-5 text-sm text-zinc-500">
                  <Loader2 size={16} className="animate-spin" />
                  Buscando no salão...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-[420px] overflow-y-auto p-2">
                  {searchResults.map((result) => {
                    const meta = SEARCH_TYPE_META[result.type];
                    const Icon = meta.icon;

                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        onClick={() => goToSearchResult(result)}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-zinc-50"
                      >
                        <span
                          className={clsx(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1",
                            meta.className
                          )}
                        >
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-zinc-950">
                            {result.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-zinc-500">
                            {result.description}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-5 text-sm text-zinc-500">
                  Nenhum resultado encontrado para esta busca.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <a
          href={canSeeAssinatura ? getRouteHref("/meu-plano") : "#"}
          aria-disabled={!canSeeAssinatura}
          className={clsx(
            "hidden min-w-0 shrink-0 items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-2 py-1.5 text-sm lg:flex xl:gap-2 xl:px-2.5",
            canSeeAssinatura
              ? "transition hover:border-zinc-300 hover:bg-white"
              : "pointer-events-none opacity-70"
          )}
        >
          <ShieldCheck size={15} className="shrink-0 text-[var(--app-accent-strong)]" />
          <span className="hidden max-w-[92px] truncate text-xs font-semibold text-zinc-900 xl:inline 2xl:max-w-[120px]">
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
        </a>

        <NotificationBell
          notifications={notifications}
          storageKey={notificationStorageKey}
        />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-10 max-w-full items-center gap-2 rounded-2xl border border-zinc-200 bg-white py-1 pl-1 pr-2 text-left text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
            aria-label="Abrir menu da conta"
          >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
              {salaoLogoUrl ? (
                <img
                  src={salaoLogoUrl}
                  alt={salaoNome || "Salão"}
                  className="h-full w-full object-cover"
                />
              ) : (
                  <span className="text-xs font-bold uppercase text-zinc-700">{initials}</span>
              )}
            </span>

            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[104px] truncate text-[13px] font-semibold 2xl:max-w-[144px]">
                {userName || "Usuário"}
              </span>
                  <span className="block max-w-[104px] truncate text-[10px] text-zinc-500 2xl:max-w-[144px]">
                {salaoNome || userEmail || "Conta principal"}
              </span>
            </span>

            <ChevronDown
              size={16}
              className={clsx("transition-transform", menuOpen && "rotate-180")}
            />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(94vw,420px)] rounded-[22px] border border-zinc-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
              <div className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-4 text-zinc-950">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Perfil do salão
                </div>
                <div className="mt-2 truncate font-display text-xl font-bold">
                  {salaoNome || "SalãoPremium"}
                </div>
                <div className="mt-1 truncate text-sm text-zinc-500">
                  {salaoResponsavel || userEmail || "Conta administradora"}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {canSeePerfilSalao ? (
                  <a
                    href={getRouteHref("/perfil-salao")}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    <Building2 size={16} />
                    Perfil do salão
                  </a>
                ) : null}

                {canSeeConfiguracoes ? (
                  <a
                    href={getRouteHref("/configuracoes")}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    <Settings size={16} />
                    Configurações
                  </a>
                ) : null}

                {canSeeAssinatura ? (
                  <>
                    <a
                      href={getRouteHref("/meu-plano")}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      <CreditCard size={16} />
                      Meu plano
                    </a>
                    <a
                      href={getRouteHref("/assinatura")}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      <CreditCard size={16} />
                      Assinatura
                    </a>
                    <a
                      href={getRouteHref("/comparar-planos")}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      <CreditCard size={16} />
                      Comparar planos
                    </a>
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

function getRouteHref(href: string) {
  if (
    href === "/assinatura" ||
    href.startsWith("/assinatura?") ||
    href.startsWith("/assinatura/")
  ) {
    return getAssinaturaUrl(href);
  }

  return getPainelUrl(href);
}
