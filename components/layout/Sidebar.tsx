"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  ChevronRight,
  CreditCard,
  ExternalLink,
  X,
} from "lucide-react";
import {
  filterPainelNavigation,
  type Permissoes,
  type PainelNavItem,
  type PlanoRecursos,
} from "@/components/layout/navigation";
import type { ResumoAssinatura } from "@/lib/assinatura-utils";
import { getAssinaturaUrl } from "@/lib/site-urls";
import {
  getWorkspaceWindowTarget,
  isPainelStandaloneWindow,
  openPainelWorkspaceWindow,
} from "@/lib/painel/workspace-windows";

type Props = {
  permissoes: Permissoes;
  planoRecursos?: PlanoRecursos;
  nivel: string;
  salaoNome?: string;
  salaoResponsavel?: string;
  salaoLogoUrl?: string | null;
  planoNome?: string;
  resumoAssinatura?: ResumoAssinatura | null;
  canSeeAssinatura: boolean;
  criticalNotificationsCount: number;
  mobileOpen: boolean;
  onClose: () => void;
};

type SidebarGroup = {
  label: string;
  items: PainelNavItem[];
};

const GROUPS: Array<{ label: string; hrefs: string[] }> = [
  {
    label: "Salão",
    hrefs: ["/dashboard", "/agenda", "/comandas", "/clientes"],
  },
  {
    label: "Equipe",
    hrefs: ["/profissionais", "/servicos", "/produtos", "/estoque"],
  },
  {
    label: "Financeiro",
    hrefs: ["/vendas", "/caixa", "/comissoes", "/relatorio-financeiro"],
  },
  {
    label: "Crescimento",
    hrefs: ["/marketing", "/novidades", "/suporte"],
  },
];

export default function Sidebar({
  permissoes,
  planoRecursos,
  nivel,
  resumoAssinatura,
  canSeeAssinatura,
  criticalNotificationsCount,
  mobileOpen,
  onClose,
}: Props) {
  const pathname = usePathname();
  const itemsFiltrados = useMemo(
    () => filterPainelNavigation(permissoes, nivel, planoRecursos),
    [permissoes, nivel, planoRecursos]
  );
  const groupedItems = useMemo(
    () => buildNavigationGroups(itemsFiltrados),
    [itemsFiltrados]
  );
  const subscriptionAtRisk = Boolean(
    resumoAssinatura?.bloqueioTotal || resumoAssinatura?.vencendoLogo
  );

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] xl:hidden"
          aria-label="Fechar menu lateral"
        />
      ) : null}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-[214px] -translate-x-full bg-white text-zinc-950 transition-transform duration-300 lg:sticky lg:top-0 lg:z-20 lg:flex lg:h-screen lg:translate-x-0 lg:flex-col",
          mobileOpen ? "translate-x-0" : ""
        )}
      >
        <div className="flex h-full flex-col overflow-hidden border-r border-zinc-200 bg-white">
          <div className="flex min-h-[61px] items-center justify-between gap-2 border-b border-zinc-200 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-950 text-white ring-1 ring-zinc-900/10">
                <img
                  src="/favicon-preview.png"
                  alt="SalãoPremium"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Sistema
                </div>
                <div className="mt-0.5 truncate font-display text-[0.98rem] font-black tracking-[-0.03em] text-zinc-950">
                  SalãoPremium
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 lg:hidden"
              aria-label="Fechar menu lateral"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="scroll-premium min-h-0 flex-1 overflow-y-auto px-3 py-4">
            {subscriptionAtRisk || criticalNotificationsCount > 0 ? (
              <div
                className={clsx(
                  "mb-4 rounded-[16px] border px-3 py-3",
                  resumoAssinatura?.bloqueioTotal || criticalNotificationsCount > 0
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 rounded-xl bg-white p-2">
                    <AlertTriangle size={15} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-current/70">
                      Atenção
                    </div>
                    <p className="mt-1 text-xs font-bold leading-5">
                      {criticalNotificationsCount > 0
                        ? `${criticalNotificationsCount} alerta(s) em aberto`
                        : resumoAssinatura?.bloqueioTotal
                          ? "Assinatura bloqueada"
                          : "Assinatura vencendo"}
                    </p>
                    {canSeeAssinatura ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          window.location.assign(getRouteHref("/assinatura"));
                        }}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl border border-current/10 bg-white px-2.5 py-2 text-[11px] font-black transition hover:bg-zinc-50"
                      >
                        <CreditCard size={13} />
                        Assinatura
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-5">
              {groupedItems.map((group) => (
                <div key={group.label}>
                  <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        active={
                          pathname === item.href ||
                          pathname.startsWith(`${item.href}/`)
                        }
                        onClose={onClose}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}

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
}: {
  item: PainelNavItem;
  active: boolean;
  onClose: () => void;
}) {
  const Icon = item.icon;
  const workspaceTarget = getWorkspaceWindowTarget(item.href);
  const standalone = isPainelStandaloneWindow();
  const target =
    workspaceTarget && !standalone
      ? workspaceTarget
      : item.openInNewTab
        ? "_blank"
        : undefined;
  const href = getRouteHref(item.href);
  const isExternalHref = /^https?:\/\//i.test(href);
  const linkClassName = clsx(
    "group/item flex min-w-0 items-center gap-2 rounded-[14px] px-2.5 py-2.5 ring-1 ring-transparent transition-all duration-200",
    active
      ? "bg-amber-50 text-zinc-950 ring-amber-200 shadow-sm"
      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
  );
  const content = (
    <>
      <span
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] transition",
          active ? "bg-zinc-950 text-white" : "bg-transparent"
        )}
      >
        <Icon size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-bold">{item.label}</span>
      </span>

      <ChevronRight
        size={15}
        className={clsx(
          "hidden shrink-0 2xl:block",
          active ? "text-zinc-700" : "text-zinc-300"
        )}
      />
      {workspaceTarget && !standalone ? (
        <ExternalLink
          size={14}
          className={clsx(
            "shrink-0",
            active ? "text-zinc-700" : "text-zinc-300"
          )}
        />
      ) : null}
    </>
  );

  if (!workspaceTarget && !target && !isExternalHref) {
    return (
      <Link
        href={href}
        prefetch
        onClick={onClose}
        className={linkClassName}
        title={`${item.label} - ${item.description}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target={target}
      rel={target === "_blank" ? "noreferrer" : undefined}
      onClick={(event) => {
        onClose();
        if (workspaceTarget) {
          event.preventDefault();
          openPainelWorkspaceWindow(item.href);
        }
      }}
      className={linkClassName}
      title={`${item.label} - ${item.description}`}
    >
      {content}
    </a>
  );
}

function getRouteHref(href: string) {
  if (
    href === "/assinatura" ||
    href.startsWith("/assinatura/") ||
    href.startsWith("/assinatura?")
  ) {
    return getAssinaturaUrl(href);
  }

  return href;
}
