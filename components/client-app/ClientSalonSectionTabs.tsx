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
      <div className="mx-auto grid max-w-6xl grid-cols-4 items-stretch text-[0.98rem] font-semibold text-zinc-500">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/app-cliente/salao/${salonId}${tab.href}`}
            className={`flex min-h-12 items-center justify-center border-b-[3px] px-2 py-3 text-center transition hover:border-zinc-950 hover:text-zinc-950 ${
              active === tab.key
                ? "border-zinc-950 font-black text-zinc-950"
                : "border-transparent"
            }`}
          >
            <span className="truncate">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
