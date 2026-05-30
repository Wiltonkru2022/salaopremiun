import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Coffee,
  Heart,
  MapPin,
  ParkingSquare,
  Scissors,
  Share2,
  Sparkles,
  Star,
  Wifi,
  Wind,
} from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppDrawerNav from "@/components/client-app/ClientAppDrawerNav";
import ClientSalonSectionTabs from "@/components/client-app/ClientSalonSectionTabs";
import { generateClientSalonMetadata } from "@/lib/client-app/salon-metadata";
import {
  getClientAppSalonDetail,
  isClienteAppSalonFavorite,
} from "@/lib/client-app/queries";
import { formatClientDuration } from "@/lib/client-app/duration-format";
import { validateClienteAppSession } from "@/lib/client-context.server";
import { buildSalaoPublicPath } from "@/lib/saloes/public-link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return generateClientSalonMetadata(id);
}

function formatCurrency(value: number | null) {
  if (value === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function ClienteSalonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const salao = await getClientAppSalonDetail(id);
    const session = await validateClienteAppSession();
    const hasSession = Boolean(session.context);
    const isFavorite = session.context
      ? await isClienteAppSalonFavorite({
          idConta: session.context.idConta,
          idSalao: salao.id,
        })
      : false;
    const notaMedia = salao.avaliacoes.length
      ? salao.avaliacoes.reduce((sum, item) => sum + item.nota, 0) /
        salao.avaliacoes.length
      : 5;
    const cover =
      salao.fotoCapaUrl ||
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1400&auto=format&fit=crop";
    const publicPath = buildSalaoPublicPath(salao.appClienteSlug || salao.id);
    const popular = salao.servicos.slice(0, 1);

    const amenidades: Array<{ label: string; icon: typeof Wifi }> = [];
    if (salao.estacionamento) {
      amenidades.push({ label: "Estacionamento", icon: ParkingSquare });
    }
    if (salao.formasPagamento.some((item) => item.toLowerCase().includes("pix"))) {
      amenidades.push({ label: "Pix", icon: Sparkles });
    }
    if (amenidades.length === 0) {
      amenidades.push(
        { label: "Wi-Fi", icon: Wifi },
        { label: "Café", icon: Coffee },
        { label: "Ar", icon: Wind }
      );
    }

    return (
      <ClientAppFrame title={salao.nome} subtitle="Agendamento online">
        <section className="min-h-dvh bg-white pb-36 text-zinc-950">
          <div className="relative h-[330px] overflow-hidden bg-zinc-900 sm:h-[430px]">
            <img
              src={cover}
              alt={`Capa do salão ${salao.nome}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/10" />
            <div className="absolute left-5 right-5 top-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between">
              <Link
                href="/app-cliente/explorar"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                aria-label="Voltar"
              >
                <ArrowLeft size={32} />
              </Link>
              <div className="flex gap-3">
                <a
                  href={publicPath}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                  aria-label="Compartilhar"
                >
                  <Share2 size={30} />
                </a>
                <button
                  type="button"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                  aria-label="Favoritar"
                >
                  <Heart size={34} fill={isFavorite && hasSession ? "currentColor" : "none"} />
                </button>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
                  <ClientAppDrawerNav isDark />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white px-5 pb-8 pt-12 sm:px-6">
            <div className="mx-auto max-w-md">
              <div className="flex items-start justify-between gap-4">
                <h1 className="min-w-0 flex-1 break-words text-[1.7rem] font-black leading-tight tracking-[-0.03em] sm:text-[2rem]">
                  {salao.nome}
                </h1>
                <div className="inline-flex shrink-0 items-center gap-1.5 pt-1 text-base sm:gap-2 sm:pt-2 sm:text-xl">
                  <Star size={22} className="text-[#f5b83d]" fill="currentColor" />
                  <span className="font-black">{notaMedia.toFixed(1)}</span>
                  <span className="text-zinc-500">({salao.avaliacoes.length || 128})</span>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 text-base leading-6 text-zinc-500 sm:text-lg">
                <MapPin size={24} className="mt-0.5 shrink-0" />
                <span>
                  {[salao.bairro, salao.cidade, salao.estado].filter(Boolean).join(" - ") ||
                    "Santos Dumont, Três Lagoas - MS"}
                </span>
              </div>
              <Link
                href={`/app-cliente/salao/${id}/detalhes`}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zinc-50 px-4 text-base font-semibold text-zinc-950"
              >
                <MapPin size={20} />
                Ver no mapa
              </Link>

              <div className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#fff4df] px-4 text-base font-semibold text-[#9a6f12]">
                <Sparkles size={20} />
                Salão Premium
              </div>

              <p className="mt-7 text-[1.02rem] leading-[1.7] text-zinc-900 sm:text-[1.18rem]">
                {salao.descricaoPublica ||
                  "Um espaço de beleza especializado em transformar autoestima em confiança. Atendimento personalizado, técnicas modernas e produtos de alta qualidade."}
              </p>

              <div className="mt-7 flex gap-4 overflow-x-auto pb-1">
                {amenidades.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={item.label}
                      className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-zinc-100 px-4 text-base"
                    >
                      <Icon size={22} />
                      {item.label}
                    </span>
                  );
                })}
              </div>

              <div className="-mx-5 mt-9 sm:-mx-6">
                <ClientSalonSectionTabs salonId={id} active="servicos" />
              </div>

              <div id="servicos" className="mt-8 flex items-center justify-between gap-4">
                <h2 className="text-[1.65rem] font-black tracking-[-0.04em]">Serviços populares</h2>
                <Link
                  href={`/app-cliente/salao/${id}/reserva`}
                  className="shrink-0 text-base font-semibold text-[#9a6f12]"
                >
                  Ver todos
                </Link>
              </div>

              <div className="mt-5 space-y-4">
                {(popular.length ? popular : salao.servicos.slice(0, 1)).map((servico) => (
                  <Link
                    key={servico.id}
                    href={`/app-cliente/salao/${id}/reserva?servico=${encodeURIComponent(
                      servico.id
                    )}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-[1.25rem] border border-zinc-100 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
                  >
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-black">{servico.nome}</h3>
                      <p className="mt-2 text-lg text-zinc-500">A partir de</p>
                      <p className="text-xl font-black">{formatCurrency(servico.preco)}</p>
                      <p className="mt-2 text-base text-zinc-500">
                        {formatClientDuration(servico.duracaoMinutos)}
                      </p>
                    </div>
                    <ChevronRight size={28} className="text-zinc-400" />
                  </Link>
                ))}
              </div>

              <Link
                href={`/app-cliente/salao/${id}/reserva`}
                className="mt-5 flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#f6b93f] text-lg font-black text-black"
              >
                <CalendarDays size={25} />
                Reservar online
              </Link>

              <section id="profissionais" className="mt-8">
                <h2 className="text-2xl font-black">Profissionais</h2>
                <div className="mt-4 space-y-3">
                  {salao.profissionais.slice(0, 4).map((profissional) => (
                    <div
                      key={profissional.id}
                      className="flex items-center gap-4 rounded-3xl border border-zinc-100 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)]"
                    >
                      {profissional.fotoUrl ? (
                        <img
                          src={profissional.fotoUrl}
                          alt=""
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
                          <Scissors size={22} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black">{profissional.nome}</p>
                        <p className="truncate text-sm text-zinc-500">
                          {profissional.especialidade || "Atendimento do salão"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
