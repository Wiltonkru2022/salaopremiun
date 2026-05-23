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
  Share2,
  Sparkles,
  Star,
  Wifi,
  Wind,
} from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { generateClientSalonMetadata } from "@/lib/client-app/salon-metadata";
import {
  getClientAppSalonDetail,
  isClienteAppSalonFavorite,
} from "@/lib/client-app/queries";
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
  searchParams?: Promise<{ status?: string }>;
  publicOnly?: boolean;
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

    return (
      <ClientAppFrame title={salao.nome} subtitle="Agendamento online">
        <section className="min-h-dvh bg-white pb-28 text-zinc-950">
          <div className="relative h-[430px] overflow-hidden bg-zinc-900">
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
              </div>
            </div>
          </div>

          <div className="-mt-10 rounded-t-[2rem] bg-white px-6 pb-8 pt-8">
            <div className="mx-auto max-w-md">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-[2.1rem] font-black leading-tight tracking-[-0.05em]">
                  {salao.nome}
                </h1>
                <div className="inline-flex shrink-0 items-center gap-2 pt-2 text-xl">
                  <Star size={22} className="text-[#f5b83d]" fill="currentColor" />
                  <span className="font-black">{notaMedia.toFixed(1)}</span>
                  <span className="text-zinc-500">
                    ({salao.avaliacoes.length || 128})
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 text-xl text-zinc-500">
                <MapPin size={24} />
                <span>
                  {[salao.bairro, salao.cidade, salao.estado].filter(Boolean).join(" - ") ||
                    "Santos Dumont, Três Lagoas - MS"}
                </span>
              </div>
              <Link
                href={`/app-cliente/salao/${id}/detalhes`}
                className="mt-5 inline-flex items-center gap-3 text-xl font-medium text-[#ad821c]"
              >
                <MapPin size={23} />
                Ver no mapa
              </Link>

              <div className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#fff4df] px-5 py-3 text-xl font-medium text-[#9a6f12]">
                <Sparkles size={24} />
                Salão Premium
              </div>

              <p className="mt-8 text-[1.45rem] leading-[1.65] text-zinc-900">
                {salao.descricaoPublica ||
                  "Um espaço de beleza especializado em transformar autoestima em confiança. Atendimento personalizado, técnicas modernas e produtos de alta qualidade."}
              </p>

              <div className="mt-7 flex gap-4 overflow-x-auto pb-1">
                {[
                  { label: "Wi-Fi", icon: Wifi },
                  { label: "Café", icon: Coffee },
                  { label: "Estacionamento", icon: ParkingSquare },
                  { label: "Ar", icon: Wind },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={item.label}
                      className="inline-flex h-14 shrink-0 items-center gap-2 rounded-2xl bg-zinc-100 px-5 text-lg"
                    >
                      <Icon size={22} />
                      {item.label}
                    </span>
                  );
                })}
              </div>

              <div className="mt-9 grid grid-cols-4 border-b border-zinc-200 text-center text-xl text-zinc-500">
                {["Serviços", "Avaliações", "Profissionais", "Sobre"].map((tab) => (
                  <div
                    key={tab}
                    className={`pb-4 ${
                      tab === "Serviços"
                        ? "border-b-4 border-zinc-950 font-black text-zinc-950"
                        : ""
                    }`}
                  >
                    {tab}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <h2 className="text-2xl font-black">Serviços populares</h2>
                <Link
                  href={`/app-cliente/salao/${id}/reserva`}
                  className="text-xl font-medium text-[#9a6f12]"
                >
                  Ver todos
                </Link>
              </div>

              <div className="mt-5 space-y-4">
                {(popular.length ? popular : salao.servicos.slice(0, 1)).map(
                  (servico) => (
                    <Link
                      key={servico.id}
                      href={`/app-cliente/salao/${id}/reserva?servico=${encodeURIComponent(
                        servico.id
                      )}`}
                      className="grid grid-cols-[128px_1fr_auto] items-center gap-5 rounded-[1.35rem] border border-zinc-100 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
                    >
                      <img
                        src="/app-cliente-hero-woman.jpeg"
                        alt=""
                        className="h-32 w-32 rounded-2xl object-cover"
                      />
                      <div>
                        <h3 className="text-xl font-black">{servico.nome}</h3>
                        <p className="mt-2 text-lg text-zinc-500">
                          A partir de
                        </p>
                        <p className="text-xl font-black">
                          {formatCurrency(servico.preco)}
                        </p>
                        <p className="mt-2 text-base text-zinc-500">
                          {servico.duracaoMinutos || 60} min
                        </p>
                      </div>
                      <ChevronRight size={28} className="text-zinc-400" />
                    </Link>
                  )
                )}
              </div>

              <Link
                href={`/app-cliente/salao/${id}/reserva`}
                className="mt-5 flex h-16 items-center justify-center gap-3 rounded-2xl bg-[#f6b93f] text-xl font-black text-black"
              >
                <CalendarDays size={25} />
                Reservar online
              </Link>
            </div>
          </div>
        </section>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
