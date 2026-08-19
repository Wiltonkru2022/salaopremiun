"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Building2, Globe2, PlugZap, ShieldCheck } from "lucide-react";

type TabKey = "perfil" | "vitrine" | "seguranca" | "integracoes";

const tabs: Array<{
  key: TabKey;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    key: "perfil",
    label: "Perfil",
    description: "Identidade, contatos e endereço do salão.",
    icon: <Building2 size={17} />,
  },
  {
    key: "vitrine",
    label: "Vitrine e portfólio",
    description: "App Cliente, fotos, divulgação e QR Code.",
    icon: <Globe2 size={17} />,
  },
  {
    key: "seguranca",
    label: "Segurança e acesso",
    description: "Senha, autenticador, login Google e zona de perigo.",
    icon: <ShieldCheck size={17} />,
  },
  {
    key: "integracoes",
    label: "Integrações",
    description: "Conexões externas usadas pelo salão.",
    icon: <PlugZap size={17} />,
  },
];

function normalize(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function sectionTab(section: HTMLElement): TabKey | "always" | "unknown" {
  const heading = normalize(section.querySelector("h1,h2")?.textContent);
  const text = normalize(section.textContent);

  if (heading.includes("perfil do salao")) return "perfil";
  if (heading.includes("dados comerciais") || heading === "endereco") return "perfil";

  if (
    heading.includes("app cliente") ||
    heading.includes("criar vitrine") ||
    heading.includes("configurar vitrine") ||
    heading.includes("divulgacao do salao")
  ) {
    return "vitrine";
  }

  if (
    heading.includes("seguranca da conta") ||
    heading.includes("login com google") ||
    heading.includes("acoes do perfil") ||
    text.includes("protecao da conta")
  ) {
    return "seguranca";
  }

  if (heading.includes("google calendar")) return "integracoes";

  return "unknown";
}

function actionTab(button: HTMLButtonElement): TabKey | "unknown" {
  const text = normalize(button.textContent);
  if (text.includes("editar dados comerciais") || text.includes("editar endereco")) {
    return "perfil";
  }
  if (text.includes("app cliente") || text.includes("criar vitrine")) return "vitrine";
  if (
    text.includes("trocar senha") ||
    text.includes("autenticador") ||
    text.includes("excluir salao")
  ) {
    return "seguranca";
  }
  return "unknown";
}

export default function PerfilSalaoOrganizer({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabKey>("perfil");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const apply = () => {
      const sections = Array.from(root.querySelectorAll<HTMLElement>("section"));

      for (const section of sections) {
        if (section.closest('[role="dialog"]')) continue;
        const bucket = sectionTab(section);
        if (bucket === "unknown") continue;
        section.style.display = bucket === activeTab ? "" : "none";
      }

      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("aside button"));
      for (const button of buttons) {
        const bucket = actionTab(button);
        if (bucket === "unknown") continue;
        button.style.display = bucket === activeTab ? "" : "none";
      }

      const actionSection = sections.find((section) =>
        normalize(section.querySelector("h2")?.textContent).includes("acoes do perfil")
      );
      if (actionSection) {
        const hasVisibleAction = Array.from(
          actionSection.querySelectorAll<HTMLButtonElement>("button")
        ).some((button) => button.style.display !== "none");
        actionSection.style.display = hasVisibleAction ? "" : "none";
      }

      const mainGrid = Array.from(root.querySelectorAll<HTMLElement>("div")).find((element) => {
        const className = element.className;
        return typeof className === "string" && className.includes("2xl:grid-cols-[minmax(0,1.45fr)_340px]");
      });
      if (mainGrid) {
        mainGrid.classList.remove("2xl:grid-cols-[minmax(0,1.45fr)_340px]");
        mainGrid.classList.add("2xl:grid-cols-[minmax(0,1fr)_320px]");
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [activeTab]);

  function selectTab(tab: TabKey) {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const current = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      <section className="sticky top-0 z-30 -mx-1 rounded-[24px] border border-zinc-200 bg-white/95 p-2 shadow-sm backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectTab(tab.key)}
                className={`flex min-h-14 items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition ${
                  active
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    active ? "bg-white/10 text-amber-300" : "bg-white text-zinc-700"
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-4">{tab.label}</span>
                  <span className={`mt-1 hidden text-[11px] leading-4 lg:block ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                    {tab.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="rounded-[22px] border border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <div className="text-sm font-black text-zinc-950">{current.label}</div>
        <div className="mt-1 text-xs leading-5 text-zinc-500">{current.description}</div>
      </div>

      <div ref={rootRef}>{children}</div>
    </div>
  );
}
