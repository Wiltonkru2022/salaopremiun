"use client";

import { usePathname } from "next/navigation";
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
import { getAssinaturaUrl, getPainelUrl } from "@/lib/site-urls";

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

export default function Sidebar({
  permissoes,
  planoRecursos,
  nivel,
  salaoNome,
  salaoResponsavel,
  salaoLogoUrl,
  planoNome,
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
          className="fixed inset-0 z-40 bg-transparent xl:hidden"
          aria-label="Fechar menu lateral"
        />
      ) : null}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-[274px] -translate-x-full bg-zinc-50 p-2 text-zinc-950 transition-transform duration-300 lg:sticky lg:top-0 lg:z-20 lg:flex lg:h-screen lg:translate-x-0 lg:flex-col",
          mobileOpen ? "translate-x-0" : ""
        )}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 px-4 py-3.5 lg:block lg:px-3.5 lg:py-3.5 xl:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-950 text-white ring-1 ring-zinc-900/10">
                {salaoLogoUrl ? (
                  <img
                    src={salaoLogoUrl}
                    alt={salaoNome || "Salao"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-display text-lg font-black uppercase">
                    {(salaoNome || "SP").slice(0, 2)}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  SalaoPremium
                </div>
                <div className="mt-1 truncate font-display text-base font-bold tracking-[-0.02em] text-zinc-950">
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 lg:hidden"
              aria-label="Fechar menu lateral"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="scroll-premium min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {subscriptionAtRisk || criticalNotificationsCount > 0 ? (
              <div
                className={clsx(
                  "mb-4 rounded-[16px] border px-3 py-3",
                  resumoAssinatura?.bloqueioTotal || criticalNotificationsCount > 0
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                )}
              >
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-xl bg-white p-2">
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
                          window.location.assign(getRouteHref("/assinatura"));
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

            <div className="space-y-4">
              {groupedItems.map((group) => (
                <div key={group.label}>
                  <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
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

type SidebarGroup = {
  label: string;
  items: PainelNavItem[];
};

const GROUPS: Array<{ label: string; hrefs: string[] }> = [
  {
    label: "Principal",
    hrefs: ["/dashboard", "/agenda", "/caixa"],
  },
  {
    label: "Atendimento",
    hrefs: ["/comandas", "/vendas"],
  },
  {
    label: "Cadastros",
    hrefs: ["/clientes", "/profissionais"],
  },
  {
    label: "Catalogo",
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
}: {
  item: PainelNavItem;
  active: boolean;
  onClose: () => void;
}) {
  const Icon = item.icon;

  return (
    <a
      href={getRouteHref(item.href)}
      target={item.openInNewTab ? "_blank" : undefined}
      rel={item.openInNewTab ? "noreferrer" : undefined}
      onClick={onClose}
      className={clsx(
        "group/item flex items-center gap-3 rounded-[14px] px-3 py-2.5 ring-1 ring-transparent transition-all duration-200",
        active
          ? "bg-zinc-950 text-white ring-zinc-900"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
      )}
    >
      <span
        className={clsx(
          "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[12px] transition",
          active ? "bg-white/12 text-white" : "bg-transparent"
        )}
      >
        <Icon size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{item.label}</span>
        <span
          className={clsx(
            "mt-0.5 block truncate text-xs",
            active ? "text-white/60" : "text-zinc-400"
          )}
        >
          {item.description}
        </span>
      </span>

      <ChevronRight
        size={15}
        className={clsx(
          "shrink-0",
          active ? "text-white/60" : "text-zinc-300"
        )}
      />
      {item.openInNewTab ? (
        <ExternalLink
          size={14}
          className={clsx(
            "shrink-0",
            active ? "text-white/60" : "text-zinc-300"
          )}
        />
      ) : null}
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

  return getPainelUrl(href);
}
