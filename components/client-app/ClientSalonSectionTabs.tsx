"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

function findSectionByHeading(label: string) {
  return (
    Array.from(document.querySelectorAll<HTMLElement>("section")).find((section) => {
      const heading = section.querySelector("h2");
      return heading?.textContent?.trim() === label;
    }) ?? null
  );
}

function getProfileSections() {
  const services = document.getElementById("servicos") as HTMLElement | null;
  const professionals = findSectionByHeading("Profissionais");
  const reviews = findSectionByHeading("Avaliações");
  const portfolio = findSectionByHeading("Portfólio");
  const about = findSectionByHeading("Sobre o salão");

  return { services, professionals, reviews, portfolio, about };
}

export default function ClientSalonSectionTabs({ salonId, active }: ClientSalonSectionTabsProps) {
  const pathname = usePathname();
  const basePath = `/app-cliente/salao/${salonId}`;
  const isMainProfile = pathname === basePath || pathname === `${basePath}/`;
  const initialKey: TabKey = active === "reserva" ? "servicos" : active;
  const [activeKey, setActiveKey] = useState<TabKey>(initialKey);
  const [missingPanel, setMissingPanel] = useState<TabKey | null>(null);

  function applyTab(key: TabKey, updateUrl = true) {
    const { services, professionals, reviews, portfolio, about } = getProfileSections();
    const all = [services, professionals, reviews, portfolio, about].filter(Boolean) as HTMLElement[];

    all.forEach((section) => {
      section.style.display = "none";
    });

    let found = false;
    if (key === "servicos") {
      if (services) {
        services.style.display = "";
        found = true;
      }
      if (professionals) professionals.style.display = "";
    } else if (key === "avaliacoes" && reviews) {
      reviews.style.display = "";
      found = true;
    } else if (key === "portfolio" && portfolio) {
      portfolio.style.display = "";
      found = true;
    } else if (key === "detalhes" && about) {
      about.style.display = "";
      found = true;
    }

    setActiveKey(key);
    setMissingPanel(found ? null : key);

    if (updateUrl) {
      window.history.replaceState(window.history.state, "", `${basePath}?aba=${key}`);
    }
  }

  useEffect(() => {
    if (!isMainProfile) return;

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("aba") as TabKey | null;
    const valid = requested && tabs.some((tab) => tab.key === requested) ? requested : initialKey;

    window.requestAnimationFrame(() => applyTab(valid, false));

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

      let key: TabKey | null = null;
      if (url.pathname === `${basePath}/avaliacoes`) key = "avaliacoes";
      else if (url.pathname === `${basePath}/portfolio`) key = "portfolio";
      else if (url.pathname === `${basePath}/detalhes`) key = "detalhes";
      else if (url.pathname === basePath || url.pathname === `${basePath}/`) key = "servicos";
      if (!key) return;

      event.preventDefault();
      applyTab(key);
    };

    document.addEventListener("click", interceptInternalProfileNavigation, true);
    return () => document.removeEventListener("click", interceptInternalProfileNavigation, true);
  }, [basePath, initialKey, isMainProfile]);

  return (
    <>
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
                  onClick={() => applyTab(tab.key)}
                  className={className}
                  aria-selected={selected}
                  role="tab"
                >
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            }

            return (
              <Link key={tab.key} href={`${basePath}${tab.href}`} className={className}>
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {isMainProfile && missingPanel ? (
        <div className="mx-4 mt-7 rounded-[1.75rem] bg-white p-7 text-center shadow-sm ring-1 ring-black/5 sm:mx-6">
          <p className="text-lg font-black text-zinc-900">
            {missingPanel === "portfolio"
              ? "Portfólio ainda não publicado"
              : missingPanel === "avaliacoes"
                ? "Ainda não há avaliações"
                : missingPanel === "detalhes"
                  ? "Informações do salão ainda não cadastradas"
                  : "Nenhum serviço disponível"}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {missingPanel === "portfolio"
              ? "Quando o salão publicar trabalhos, as fotos aparecerão aqui."
              : missingPanel === "avaliacoes"
                ? "As avaliações reais dos atendimentos aparecerão aqui."
                : missingPanel === "detalhes"
                  ? "Descrição, comodidades e formas de pagamento aparecerão aqui quando forem cadastradas."
                  : "O salão ainda não publicou serviços para agendamento online."}
          </p>
        </div>
      ) : null}
    </>
  );
}
