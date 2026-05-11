import Link from "next/link";

type ClientSalonSectionTabsProps = {
  salonId: string;
  active: "servicos" | "avaliacoes" | "portfolio" | "detalhes";
};

const tabs = [
  { key: "servicos", label: "Servicos", href: "" },
  { key: "avaliacoes", label: "Avaliacoes", href: "/avaliacoes" },
  { key: "portfolio", label: "Portfolio", href: "/portfolio" },
  { key: "detalhes", label: "Detalhes", href: "/detalhes" },
] as const;

export default function ClientSalonSectionTabs({
  salonId,
  active,
}: ClientSalonSectionTabsProps) {
  return (
    <nav className="sticky top-[76px] z-20 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur md:top-[88px] md:px-6">
      <div className="mx-auto flex max-w-6xl gap-8 overflow-x-auto text-sm font-black uppercase tracking-[0.08em] text-zinc-500">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/app-cliente/salao/${salonId}${tab.href}`}
            className={`shrink-0 border-b-4 px-0 py-4 transition hover:border-zinc-950 hover:text-zinc-950 ${
              active === tab.key
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
