"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TabKey = "servicos" | "avaliacoes" | "portfolio" | "detalhes";
type ClientSalonSectionTabsProps = {
  salonId: string;
  active: "servicos" | "reserva" | "avaliacoes" | "portfolio" | "detalhes";
};

const tabs = [
  { key: "servicos", label: "Serviços", href: "" },
  { key: "avaliacoes", label: "Avaliações", href: "/avaliacoes" },
  { key: "portfolio", label: "Portfólio", href: "/portfolio" },
  { key: "detalhes", label: "Sobre", href: "/detalhes" },
] as const;

function findSection(key: TabKey) {
  if (key === "servicos") return document.getElementById("servicos");

  const headingByKey: Record<Exclude<TabKey, "servicos">, string> = {
    avaliacoes: "Avaliações",
    portfolio: "Portfólio",
    detalhes: "Sobre o salão",
  };

  return Array.from(document.querySelectorAll<HTMLElement>("section")).find((section) => {
    const heading = section.querySelector("h2");
    return heading?.textContent?.trim() === headingByKey[key];
  }) ?? null;
}

function keyFromHref(href: string, salonId: string): TabKey | null {
  const base = `/app-cliente/salao/${salonId}`;
  const normalized = href.split("?")[0].split("#")[0];
  if (normalized === base || normalized === `${base}/`) return "servicos";
  if (normalized === `${base}/avaliacoes`) return "avaliacoes";
  if (normalized === `${base}/portfolio`) return "portfolio";
  if (normalized === `${base}/detalhes`) return "detalhes";
  return null;
}

export default function ClientSalonSectionTabs({ salonId, active }: ClientSalonSectionTabsProps) {
  const pathname = usePathname();
  const basePath = `/app-cliente/salao/${salonId}`;
  const isMainProfile = pathname === basePath || pathname === `${basePath}/`;
  const initialKey = active === "reserva" ? "servicos" : active;
  const [activeKey, setActiveKey] = useState<TabKey>(initialKey);
  const tabKeys = useMemo(() => tabs.map((tab) => tab.key), []);

  function goToSection(key: TabKey, behavior: ScrollBehavior = "smooth") {
    const section = findSection(key);
    if (!section) return false;

    setActiveKey(key);
    const top = window.scrollY + section.getBoundingClientRect().top - 76;
    window.scrollTo({ top: Math.max(0, top), behavior });
    window.history.replaceState(window.history.state, "", `${basePath}#${key}`);
    return true;
  }

  useEffect(() => {
    if (!isMainProfile) return;

    const hash = window.location.hash.replace("#", "") as TabKey;
    if (tabKeys.includes(hash)) {
      window.requestAnimationFrame(() => goToSection(hash, "auto"));
    }

    const sections = tabKeys
      .map((key) => ({ key, element: findSection(key) }))
      .filter((item): item is { key: TabKey; element: HTMLElement } => Boolean(item.element));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
        if (!visible) return;
        const match = sections.find((item) => item.element === visible.target);
        if (match) setActiveKey(match.key);
      },
      { rootMargin: "-92px 0px -60% 0px", threshold: [0, 0.1, 0.5] },
    );

    sections.forEach((item) => observer.observe(item.element));

    const interceptInternalProfileNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank") return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const key = keyFromHref(url.pathname, salonId);
      if (!key) return;

      event.preventDefault();
      goToSection(key);
    };

    document.addEventListener("click", interceptInternalProfileNavigation, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", interceptInternalProfileNavigation, true);
    };
  }, [basePath, isMainProfile, salonId, tabKeys]);

  return (
    <nav className="sticky top-0 z-30 border-b border-zinc-200 bg-white/96 px-4 backdrop-blur-md md:px-6" aria-label="Seções do salão">
      <div className="mx-auto grid max-w-6xl grid-cols-4 items-stretch text-[0.98rem] font-semibold text-zinc-500">
        {tabs.map((tab) => {
          const selected = isMainProfile ? activeKey === tab.key : active === tab.key;
          const className = `flex min-h-12 items-center justify-center border-b-[3px] px-2 py-3 text-center transition ${
            selected
              ? "border-zinc-950 font-black text-zinc-950"
              : "border-transparent hover:border-zinc-300 hover:text-zinc-950"
          }`;

          if (isMainProfile) {
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => goToSection(tab.key)}
                className={className}
                aria-current={selected ? "page" : undefined}
              >
                <span className="truncate">{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.key}
              href={`${basePath}${tab.href}`}
              className={className}
              aria-current={selected ? "page" : undefined}
            >
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
