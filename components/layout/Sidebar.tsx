"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import clsx from "clsx";
import { AlertTriangle, CreditCard, LogOut, X } from "lucide-react";
import {
  filterPainelNavigation,
  type Permissoes,
} from "@/components/layout/navigation";
import type { ResumoAssinatura } from "@/lib/assinatura-utils";

type Props = {
  permissoes: Permissoes;
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
  onLogout: () => Promise<void>;
};

export default function Sidebar({
  permissoes,
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
  onLogout,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const itemsFiltrados = useMemo(
    () => filterPainelNavigation(permissoes, nivel),
    [permissoes, nivel]
  );
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
          "group fixed inset-y-0 left-0 z-50 w-[272px] -translate-x-full border-r border-white/10 bg-[linear-gradient(180deg,#07101b,#0d1724_54%,#14251f)] text-white transition-[width,transform] duration-300 lg:sticky lg:top-0 lg:z-20 lg:flex lg:h-screen lg:w-[74px] lg:translate-x-0 lg:flex-col lg:overflow-hidden lg:hover:w-[252px]",
          mobileOpen ? "translate-x-0" : ""
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 lg:block lg:px-3 lg:py-4 xl:px-4 xl:py-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-white/10 ring-1 ring-white/10">
                {salaoLogoUrl ? (
                  <img
                    src={salaoLogoUrl}
                    alt={salaoNome || "Salao"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-display text-lg font-bold uppercase">
                    {(salaoNome || "SP").slice(0, 2)}
                  </span>
                )}
              </div>

              <div className="min-w-0 lg:max-w-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-300 lg:group-hover:max-w-[170px] lg:group-hover:opacity-100">
                <div className="truncate text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  SaaS beauty
                </div>
                <div className="mt-1 truncate font-display text-2xl font-bold tracking-[-0.05em] text-white">
                  {salaoNome || "SalaoPremium"}
                </div>
                <div className="mt-1 truncate text-xs text-white/55">
                  {salaoResponsavel || "Gestao pronta para escalar"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 lg:hidden"
              aria-label="Fechar menu lateral"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="scroll-premium min-h-0 flex-1 overflow-y-auto px-3 py-4">
            {subscriptionAtRisk || criticalNotificationsCount > 0 ? (
              <div
                className={clsx(
                  "mb-4 rounded-[22px] border px-3 py-3",
                  resumoAssinatura?.bloqueioTotal || criticalNotificationsCount > 0
                    ? "border-rose-300 bg-rose-500/10 text-rose-50"
                    : "border-amber-300 bg-amber-500/10 text-amber-50"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-2xl bg-white/10 p-2">
                    <AlertTriangle size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                      Estado global
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {criticalNotificationsCount > 0
                        ? `${criticalNotificationsCount} alerta(s) critico(s) em aberto`
                        : resumoAssinatura?.bloqueioTotal
                          ? "Assinatura com bloqueio ativo"
                          : "Assinatura vencendo em breve"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/75">
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
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                      >
                        <CreditCard size={14} />
                        Abrir assinatura
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-2.5">
              {itemsFiltrados.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={onClose}
                    onFocus={() => router.prefetch(item.href)}
                    onMouseEnter={() => router.prefetch(item.href)}
                    className={clsx(
                    "group/item flex items-center gap-3 rounded-[18px] px-3 py-2.5 ring-1 ring-transparent transition-all duration-300 lg:h-11 lg:w-11 lg:justify-center lg:px-0 lg:py-0 lg:group-hover:w-full lg:group-hover:justify-start lg:group-hover:px-3",
                      active
                        ? "bg-white/12 text-white ring-white/12"
                        : "text-white/72 hover:bg-white/8 hover:text-white"
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 transition",
                        active
                          ? "bg-white/14 text-white ring-white/18"
                          : "bg-white/8 ring-white/10 group-hover/item:bg-white/12"
                      )}
                    >
                      <Icon size={18} />
                    </span>

                    <span className="min-w-0 lg:max-w-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-300 lg:group-hover:max-w-[180px] lg:group-hover:opacity-100">
                      <span className="block truncate text-sm font-semibold">
                        {item.label}
                      </span>
                      <span
                        className={clsx(
                          "mt-0.5 block truncate text-xs",
                          active ? "text-white/58" : "text-white/45"
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 px-3 py-4">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-[18px] border border-white/10 px-3 py-2.5 text-sm font-semibold text-white/82 transition hover:bg-white/8 lg:h-11 lg:w-11 lg:justify-center lg:px-0 lg:py-0 lg:group-hover:w-full lg:group-hover:justify-start lg:group-hover:px-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/8 ring-1 ring-white/10">
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
