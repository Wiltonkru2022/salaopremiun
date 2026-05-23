import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Accessibility,
  ArrowLeft,
  CalendarDays,
  Car,
  Clock,
  Coffee,
  Gem,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Star,
  Wifi,
} from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { getClientAppSalonDetail } from "@/lib/client-app/queries";
import { buildSalaoPublicPath } from "@/lib/saloes/public-link";

export const metadata = {
  title: "Detalhes do Salão",
};

const DIAS_LABEL: Record<string, string> = {
  domingo: "Domingo",
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
};

const DIAS_BY_INDEX = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

function normalizePhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function normalizeDia(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDiasFuncionamento(dias: string[]) {
  const normalized = dias.map(normalizeDia).filter(Boolean);
  if (!normalized.length) return "Dias em atualização";
  return normalized.map((dia) => DIAS_LABEL[dia] || dia).join(", ");
}

function formatPhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10) return value || "(67) 99999-9999";
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7, 11)}`;
}

export default async function ClienteSalonDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const salao = await getClientAppSalonDetail(id);
    const phone = normalizePhone(salao.whatsapp || salao.telefone);
    const publicPath = buildSalaoPublicPath(salao.appClienteSlug || salao.id);
    const mapsUrl = salao.enderecoCompleto
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          salao.enderecoCompleto
        )}`
      : null;
    const hojeKey = DIAS_BY_INDEX[new Date().getDay()];
    const diasFuncionamento = salao.horarioFuncionamento.diasFuncionamento.map(
      normalizeDia
    );
    const abertoHoje = diasFuncionamento.includes(hojeKey);
    const horarioLabel = `${salao.horarioFuncionamento.horaAbertura} - ${salao.horarioFuncionamento.horaFechamento}`;
    const diasLabel = formatDiasFuncionamento(
      salao.horarioFuncionamento.diasFuncionamento
    );
    const notaMedia = salao.avaliacoes.length
      ? salao.avaliacoes.reduce((sum, item) => sum + item.nota, 0) /
        salao.avaliacoes.length
      : 5;
    const cover =
      salao.fotoCapaUrl ||
      "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=1400&auto=format&fit=crop";
    const logo = salao.logoUrl || "/icons/icon-192.png";
    const photos = salao.portfolio.length
      ? salao.portfolio.map((foto) => foto.imagemUrl)
      : [
          cover,
          "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=800&auto=format&fit=crop",
        ];

    return (
      <ClientAppFrame title={salao.nome} subtitle="Contato e funcionamento">
        <section className="min-h-dvh bg-[#050505] pb-36 text-white">
          <div className="relative min-h-[430px] overflow-hidden px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <img
              src={cover}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-[#050505]" />

            <div className="relative z-10 flex items-center justify-between">
              <Link
                href={`/app-cliente/salao/${id}`}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                aria-label="Voltar"
              >
                <ArrowLeft size={28} />
              </Link>
              <div className="flex gap-3">
                <a
                  href={publicPath}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                  aria-label="Compartilhar"
                >
                  <Share2 size={25} />
                </a>
                <button
                  type="button"
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                  aria-label="Favoritar"
                >
                  <Heart size={28} />
                </button>
              </div>
            </div>

            <div className="relative z-10 mt-12 flex items-end gap-5">
              <img
                src={logo}
                alt=""
                className="h-28 w-28 rounded-3xl border border-white/15 bg-black object-cover shadow-2xl"
              />
              <div className="min-w-0 flex-1 pb-1">
                <h1 className="text-[1.9rem] font-black leading-tight tracking-[-0.04em]">
                  {salao.nome}
                </h1>
                <div className="mt-2 flex items-center gap-2 text-base text-zinc-100">
                  <Star size={18} className="text-[#f6b93f]" fill="currentColor" />
                  <span className="font-bold">{notaMedia.toFixed(1)}</span>
                  <span>• {salao.avaliacoes.length || 128} avaliações</span>
                </div>
                <div className="mt-2 flex items-start gap-2 text-sm leading-5 text-zinc-200">
                  <MapPin size={17} className="mt-0.5 shrink-0" />
                  <span>
                    {salao.enderecoCompleto ||
                      "Rua Manoel Jorge, 1433 Santos Dumont - MS, 79620-100"}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-7 grid grid-cols-2 gap-3">
              <a
                href={mapsUrl || "#"}
                target={mapsUrl ? "_blank" : undefined}
                rel={mapsUrl ? "noreferrer" : undefined}
                className="flex h-16 items-center justify-center gap-3 rounded-2xl border border-white/25 bg-black/25 text-base font-black backdrop-blur"
              >
                <MapPin size={22} />
                Ver no mapa
              </a>
              <a
                href={phone ? `https://wa.me/${phone}` : "#"}
                target={phone ? "_blank" : undefined}
                rel={phone ? "noreferrer" : undefined}
                className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-[#22c55e] text-base font-black text-white"
              >
                <MessageCircle size={23} />
                WhatsApp
              </a>
            </div>
          </div>

          <div className="mx-auto max-w-md space-y-5 px-5">
            <section className="overflow-hidden rounded-3xl bg-[#171819]">
              <div className="grid grid-cols-[72px_1fr_auto] items-center gap-3 border-b border-white/8 px-5 py-5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/8">
                  <Clock size={27} />
                </span>
                <div>
                  <p className="font-bold text-[#22c55e]">
                    {abertoHoje ? "Aberto hoje" : "Fechado hoje"}
                  </p>
                  <p className="text-zinc-200">
                    {abertoHoje ? "Fecha às 19:00" : diasLabel}
                  </p>
                </div>
                <div className="text-right">
                  {abertoHoje ? (
                    <span className="mb-1 inline-block rounded-full bg-[#22c55e] px-3 py-1 text-xs font-bold">
                      Aberto
                    </span>
                  ) : null}
                  <p className="font-black">{horarioLabel}</p>
                </div>
              </div>

              <div className="grid grid-cols-[72px_1fr_auto] items-center gap-3 border-b border-white/8 px-5 py-5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/8">
                  <CalendarDays size={25} />
                </span>
                <div>
                  <p>Funcionamento</p>
                  <p className="text-zinc-200">{diasLabel}</p>
                </div>
                <p className="font-black">{horarioLabel}</p>
              </div>

              <div className="grid grid-cols-[72px_1fr_auto] items-center gap-3 border-b border-white/8 px-5 py-5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/8">
                  <Phone size={25} />
                </span>
                <div>
                  <p>Telefone</p>
                  <p className="text-zinc-200">
                    {formatPhone(salao.telefone || salao.whatsapp)}
                  </p>
                </div>
                <a
                  href={phone ? `tel:+${phone}` : "#"}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22c55e]"
                  aria-label="Ligar"
                >
                  <Phone size={25} fill="currentColor" />
                </a>
              </div>

              <div className="grid grid-cols-[72px_1fr_auto] items-center gap-3 px-5 py-5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/8">
                  <MessageCircle size={25} />
                </span>
                <div>
                  <p>Atendimento rápido</p>
                  <p className="text-zinc-200">Fale com o salão</p>
                </div>
                <a
                  href={phone ? `https://wa.me/${phone}` : "#"}
                  target={phone ? "_blank" : undefined}
                  rel={phone ? "noreferrer" : undefined}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22c55e]"
                  aria-label="WhatsApp"
                >
                  <MessageCircle size={25} />
                </a>
              </div>
            </section>

            <section className="rounded-3xl bg-[#171819] p-5">
              <h2 className="text-2xl font-black">Sobre o salão</h2>
              <p className="mt-3 text-lg leading-7 text-zinc-200">
                {salao.descricaoPublica ||
                  "Ambiente acolhedor, profissionais especializados e os melhores serviços para realçar sua beleza."}
              </p>

              <div className="mt-7 grid grid-cols-5 gap-3 text-center text-xs font-semibold text-zinc-100">
                {[
                  { label: "Wi-Fi", icon: Wifi },
                  { label: "Pagamento Pix", icon: Gem },
                  { label: "Café", icon: Coffee },
                  { label: "Estacionamento", icon: Car },
                  { label: "Acessibilidade", icon: Accessibility },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="min-w-0">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 text-[#f6b93f]">
                        <Icon size={25} />
                      </span>
                      <p className="mt-2 break-words leading-4">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl bg-[#171819] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Fotos do salão</h2>
                <Link
                  href={`/app-cliente/salao/${id}/portfolio`}
                  className="font-bold text-[#f6b93f]"
                >
                  Ver todas
                </Link>
              </div>
              <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
                {photos.slice(0, 6).map((photo, index) => (
                  <img
                    key={`${photo}-${index}`}
                    src={photo}
                    alt=""
                    className="h-28 w-36 shrink-0 rounded-2xl object-cover"
                  />
                ))}
              </div>
            </section>
          </div>
        </section>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
