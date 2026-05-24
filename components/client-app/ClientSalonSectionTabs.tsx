import Link from "next/link";

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

export default function ClientSalonSectionTabs({
  salonId,
  active,
}: ClientSalonSectionTabsProps) {
  return (
    <nav className="border-b border-zinc-200 bg-white px-4 md:px-6">
      <div className="mx-auto flex max-w-6xl gap-8 overflow-x-auto text-[1.04rem] font-semibold text-zinc-500">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/app-cliente/salao/${salonId}${tab.href}`}
            className={`shrink-0 whitespace-nowrap border-b-[3px] px-0 py-4 transition hover:border-zinc-950 hover:text-zinc-950 ${
              active === tab.key
                ? "border-zinc-950 font-black text-zinc-950"
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
