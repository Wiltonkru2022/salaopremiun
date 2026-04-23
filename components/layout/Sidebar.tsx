"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  ChevronRight,
  CreditCard,
  HelpCircle,
  LogOut,
  Search,
  Settings,
  X,
} from "lucide-react";
import {
  filterPainelNavigation,
  type Permissoes,
  type PainelNavItem,
} from "@/components/layout/navigation";
import type { ResumoAssinatura } from "@/lib/assinatura-utils";

type Props = {
  permissoes: Permissoes;
  nivel: string;
  salaoNome?: string;
  salaoResponsavel?: string;
  salaoLogoUrl?: string | null;
  userName?: string;
  userEmail?: string;
  planoNome?: string;
  resumoAssinatura?: ResumoAssinatura | null;
  canSeeAssinatura: boolean;
  criticalNotificationsCount: number;
  mobileOpen: boolean;
  onClose: () => void;
  onLogout: () => Promise<void>;
};

export default function Sidebar({
  permissoes,
  nivel,
  salaoNome,
  salaoResponsavel,
  salaoLogoUrl,
  userName,
  userEmail,
  planoNome,
  resumoAssinatura,
  canSeeAssinatura,
  criticalNotificationsCount,
  mobileOpen,
  onClose,
  onLogout,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const itemsFiltrados = useMemo(
    () => filterPainelNavigation(permissoes, nivel),
    [permissoes, nivel]
  );
  const searchTerm = search.trim().toLowerCase();
  const itemsVisiveis = useMemo(() => {
    if (!searchTerm) return itemsFiltrados;

    return itemsFiltrados.filter((item) =>
      [item.label, item.shortLabel, item.description]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm)
    );
  }, [itemsFiltrados, searchTerm]);
  const groupedItems = useMemo(
    () => buildNavigationGroups(itemsVisiveis),
    [itemsVisiveis]
  );
  const utilityItems = useMemo(() => {
    const items: Array<{
      href: string;
      label: string;
      icon: typeof Settings;
      enabled: boolean;
    }> = [
      {
        href: "/suporte",
        label: "Ajuda e suporte",
        icon: HelpCircle,
        enabled: Boolean(permissoes?.suporte_ver),
      },
      {
        href: "/configuracoes",
        label: "Configuracoes",
        icon: Settings,
        enabled: Boolean(permissoes?.configuracoes_ver),
      },
      {
        href: "/assinatura",
        label: "Assinatura",
        icon: CreditCard,
        enabled: canSeeAssinatura,
      },
    ];

    return items.filter((item) => item.enabled);
  }, [canSeeAssinatura, permissoes]);
  const subscriptionAtRisk = Boolean(
    resumoAssinatura?.bloqueioTotal || resumoAssinatura?.vencendoLogo
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const prefetchTimer = window.setTimeout(() => {
      itemsFiltrados.forEach((item) => {
        router.prefetch(item.href);
      });
    }, 600);

    return () => window.clearTimeout(prefetchTimer);
  }, [itemsFiltrados, router]);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-transparent xl:hidden"
          aria-label="Fechar menu lateral"
        />
      ) : null}

      <aside
        className={clsx(
          "group fixed inset-y-0 left-0 z-50 w-[292px] -translate-x-full bg-[#eceff3] p-3 text-zinc-950 transition-[width,transform] duration-300 lg:sticky lg:top-0 lg:z-20 lg:flex lg:h-screen lg:w-[86px] lg:translate-x-0 lg:flex-col lg:overflow-hidden lg:hover:w-[292px]",
          mobileOpen ? "translate-x-0" : ""
        )}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/92 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex items-start justify-between gap-3 px-4 py-4 lg:block lg:px-3 lg:py-4 xl:px-4">
            <div className="flex min-w-0 items-center gap-3 lg:justify-center lg:group-hover:justify-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#ecf2ff] ring-1 ring-blue-100">
                {salaoLogoUrl ? (
                  <img
                    src={salaoLogoUrl}
                    alt={salaoNome || "Salao"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-display text-lg font-black uppercase text-blue-700">
                    {(salaoNome || "SP").slice(0, 2)}
                  </span>
                )}
              </div>

              <div className="min-w-0 lg:max-w-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-300 lg:group-hover:max-w-[190px] lg:group-hover:opacity-100">
                <div className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  SalaoPremium
                </div>
                <div className="mt-1 truncate font-display text-lg font-black tracking-[-0.04em] text-zinc-950">
                  {salaoNome || "SalaoPremium"}
                </div>
                <div className="mt-0.5 truncate text-xs text-zinc-500">
                  {salaoResponsavel || "Gestao do salao"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 lg:hidden"
              aria-label="Fechar menu lateral"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 pb-3 lg:px-3 xl:px-4">
            <label className="relative block lg:flex lg:justify-center lg:group-hover:block">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 lg:left-1/2 lg:-translate-x-1/2 lg:group-hover:left-3 lg:group-hover:translate-x-0"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar..."
                className="h-11 w-full rounded-[15px] border border-zinc-200 bg-zinc-50 pl-10 pr-3 text-sm font-medium text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-50 lg:w-11 lg:pl-11 lg:pr-0 lg:text-transparent lg:group-hover:w-full lg:group-hover:pl-10 lg:group-hover:pr-3 lg:group-hover:text-zinc-800"
              />
            </label>
          </div>

          <nav className="scroll-premium min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {subscriptionAtRisk || criticalNotificationsCount > 0 ? (
              <div
                className={clsx(
                  "mb-4 rounded-[22px] border px-3 py-3 lg:hidden lg:group-hover:block",
                  resumoAssinatura?.bloqueioTotal || criticalNotificationsCount > 0
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-2xl bg-white p-2 shadow-sm">
                    <AlertTriangle size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-current/70">
                      Estado global
                    </div>
                    <p className="mt-1 text-sm font-semibold">
                      {criticalNotificationsCount > 0
                        ? `${criticalNotificationsCount} alerta(s) critico(s) em aberto`
                        : resumoAssinatura?.bloqueioTotal
                          ? "Assinatura com bloqueio ativo"
                          : "Assinatura vencendo em breve"}
                    </p>
                    <p className="mt-1 text-xs leading-5 opacity-80">
                      {criticalNotificationsCount > 0
                        ? "Use o sininho e a area de assinatura para nao deixar risco escondido."
                        : `${planoNome || "Plano atual"} exige revisao para manter a operacao sem interrupcao.`}
                    </p>
                    {canSeeAssinatura ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          void router.push("/assinatura");
                        }}
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-current/10 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-zinc-50"
                      >
                        <CreditCard size={14} />
                        Abrir assinatura
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-5">
              {groupedItems.map((group) => (
                <div key={group.label}>
                  <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400 lg:hidden lg:group-hover:block">
                    {group.label}
                  </div>
                  <div className="space-y-1.5">
                    {group.items.map((item) => (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        active={
                          pathname === item.href ||
                          pathname.startsWith(`${item.href}/`)
                        }
                        onClose={onClose}
                        onPrefetch={() => router.prefetch(item.href)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {searchTerm && itemsVisiveis.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-xs font-medium text-zinc-500 lg:hidden lg:group-hover:block">
                  Nenhum modulo encontrado.
                </div>
              ) : null}
            </div>
          </nav>

          <div className="border-t border-zinc-100 px-3 py-3">
            {utilityItems.length ? (
              <div className="mb-3 space-y-1.5">
                {utilityItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={clsx(
                        "flex items-center gap-3 rounded-[16px] px-3 py-2.5 transition lg:h-10 lg:w-10 lg:justify-center lg:px-0 lg:py-0 lg:group-hover:w-full lg:group-hover:justify-start lg:group-hover:px-3",
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                      )}
                    >
                      <Icon size={18} />
                      <span className="text-sm font-semibold lg:max-w-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-300 lg:group-hover:max-w-[170px] lg:group-hover:opacity-100">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : null}

            <div className="mb-3 flex items-center gap-3 rounded-[18px] bg-zinc-50 p-2.5 lg:justify-center lg:bg-transparent lg:p-0 lg:group-hover:justify-start lg:group-hover:bg-zinc-50 lg:group-hover:p-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-black uppercase text-white">
                {(userName || salaoResponsavel || salaoNome || "SP").slice(0, 2)}
              </div>
              <div className="min-w-0 lg:max-w-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-300 lg:group-hover:max-w-[180px] lg:group-hover:opacity-100">
                <div className="truncate text-sm font-bold text-zinc-950">
                  {userName || salaoResponsavel || "Usuario"}
                </div>
                <div className="truncate text-xs text-zinc-500">
                  {userEmail || planoNome || "Painel do salao"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-sm font-semibold text-zinc-500 transition hover:bg-red-50 hover:text-red-700 lg:h-10 lg:w-10 lg:justify-center lg:px-0 lg:py-0 lg:group-hover:w-full lg:group-hover:justify-start lg:group-hover:px-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-zinc-50 ring-1 ring-zinc-100">
                <LogOut size={18} />
              </span>

              <span className="lg:max-w-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-300 lg:group-hover:max-w-[160px] lg:group-hover:opacity-100">
                Encerrar sessao
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

type SidebarGroup = {
  label: string;
  items: PainelNavItem[];
};

const GROUPS: Array<{ label: string; hrefs: string[] }> = [
  {
    label: "Principal",
    hrefs: ["/dashboard", "/agenda", "/clientes", "/profissionais"],
  },
  {
    label: "Atendimento",
    hrefs: ["/comandas", "/caixa", "/vendas"],
  },
  {
    label: "Catalogo e estoque",
    hrefs: ["/servicos", "/produtos", "/estoque"],
  },
  {
    label: "Gestao",
    hrefs: ["/comissoes", "/relatorio-financeiro", "/marketing", "/suporte"],
  },
];

function buildNavigationGroups(items: PainelNavItem[]): SidebarGroup[] {
  const byHref = new Map(items.map((item) => [item.href, item]));
  const used = new Set<string>();
  const groups = GROUPS.map((group) => ({
    label: group.label,
    items: group.hrefs
      .map((href) => byHref.get(href))
      .filter((item): item is PainelNavItem => Boolean(item)),
  })).filter((group) => group.items.length > 0);

  groups.forEach((group) => {
    group.items.forEach((item) => used.add(item.href));
  });

  const rest = items.filter((item) => !used.has(item.href));
  if (rest.length) {
    groups.push({ label: "Outros", items: rest });
  }

  return groups;
}

function SidebarLink({
  item,
  active,
  onClose,
  onPrefetch,
}: {
  item: PainelNavItem;
  active: boolean;
  onClose: () => void;
  onPrefetch: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch={true}
      onClick={onClose}
      onFocus={onPrefetch}
      onMouseEnter={onPrefetch}
      className={clsx(
        "group/item flex items-center gap-3 rounded-[17px] px-3 py-2.5 ring-1 ring-transparent transition-all duration-300 lg:h-11 lg:w-11 lg:justify-center lg:px-0 lg:py-0 lg:group-hover:w-full lg:group-hover:justify-start lg:group-hover:px-3",
        active
          ? "bg-[#edf2ff] text-blue-700 ring-blue-100 shadow-sm"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
      )}
    >
      <span
        className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] transition",
          active ? "bg-blue-600 text-white" : "bg-transparent"
        )}
      >
        <Icon size={18} />
      </span>

      <span className="min-w-0 flex-1 lg:max-w-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-300 lg:group-hover:max-w-[180px] lg:group-hover:opacity-100">
        <span className="block truncate text-sm font-bold">{item.label}</span>
        <span
          className={clsx(
            "mt-0.5 block truncate text-xs",
            active ? "text-blue-500" : "text-zinc-400"
          )}
        >
          {item.description}
        </span>
      </span>

      <ChevronRight
        size={15}
        className={clsx(
          "lg:hidden lg:group-hover:block",
          active ? "text-blue-500" : "text-zinc-300"
        )}
      />
    </Link>
  );
}
