import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Accessibility,
  ArrowLeft,
  CalendarDays,
  Camera,
  Clock3,
  Coffee,
  CreditCard,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  ParkingSquare,
  Phone,
  Scissors,
  Sparkles,
  Star,
  Wifi,
  Wind,
} from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppDrawerNav from "@/components/client-app/ClientAppDrawerNav";
import ClientSalonSectionTabs from "@/components/client-app/ClientSalonSectionTabs";
import {
  ClientSalonLiveDistance,
  ClientSalonPortfolioGallery,
  ClientSalonShareButton,
} from "@/components/client-app/ClientSalonProfileInteractive";
import { generateClientSalonMetadata } from "@/lib/client-app/salon-metadata";
import { isClienteAppSalonFavorite } from "@/lib/client-app/queries";
import { formatClientDuration } from "@/lib/client-app/duration-format";
import { validateClienteAppSession } from "@/lib/client-context.server";
import { getClientSalonProfile } from "@/app/services/cliente-app/salon-profile";
import { toggleClienteSalonFavoriteAction } from "./actions";

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

function normalizePhone(value: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function whatsappUrl(value: string | null) {
  const digits = normalizePhone(value);
  if (!digits) return null;
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${international}`;
}

function mapsUrl(params: {
  latitude: number | null;
  longitude: number | null;
  enderecoCompleto: string | null;
}) {
  const query =
    params.latitude !== null && params.longitude !== null
      ? `${params.latitude},${params.longitude}`
      : params.enderecoCompleto;
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const dayLabels: Record<string, string> = {
  segunda: "Seg",
  terca: "Ter",
  quarta: "Qua",
  quinta: "Qui",
  sexta: "Sex",
  sabado: "Sáb",
  domingo: "Dom",
};

function formatWorkingDays(days: string[]) {
  return days.map((day) => dayLabels[day] || day).join(", ");
}

function reviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function ClienteSalonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const salao = await getClientSalonProfile(id);
    const session = await validateClienteAppSession();
    const hasSession = Boolean(session.context);
    const isFavorite = session.context
      ? await isClienteAppSalonFavorite({
          idConta: session.context.idConta,
          idSalao: salao.id,
        })
      : false;

    const favoriteLoginUrl = `/app-cliente/login?next=${encodeURIComponent(
      `/app-cliente/salao/${id}`
    )}`;
    const reserveUrl = `/app-cliente/salao/${id}/reserva`;
    const mapUrl = mapsUrl(salao);
    const whatsUrl = whatsappUrl(salao.whatsapp);
    const phoneDigits = normalizePhone(salao.telefone);
    const addressLabel = salao.enderecoCompleto;
    const popularServices = salao.servicos.slice(0, 5);
    const recentReviews = salao.avaliacoes.slice(0, 3);
    const professionalMap = new Map(
      salao.profissionais.map((professional) => [professional.id, professional.nome])
    );

    const amenities = [
      salao.estacionamento
        ? { label: "Estacionamento", icon: ParkingSquare }
        : null,
      salao.acessibilidade
        ? { label: "Acessibilidade", icon: Accessibility }
        : null,
      salao.wifi ? { label: "Wi-Fi", icon: Wifi } : null,
      salao.cafe ? { label: "Café", icon: Coffee } : null,
      salao.arCondicionado
        ? { label: "Ar-condicionado", icon: Wind }
        : null,
    ].filter(Boolean) as Array<{
      label: string;
      icon: typeof Wifi;
    }>;

    return (
      <ClientAppFrame title={salao.nome} subtitle="Agendamento online">
        <section className="min-h-dvh bg-[#f7f7f5] pb-40 text-zinc-950">
          <div className="relative h-[330px] overflow-hidden bg-zinc-950 sm:h-[430px]">
            {salao.fotoCapaUrl ? (
              <img
                src={salao.fotoCapaUrl}
                alt={`Capa do salão ${salao.nome}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-800 to-[#8b651e]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/45" />

            <header className="sp-mobile-fixed fixed inset-x-0 top-0 z-[70] border-b border-zinc-200/80 bg-white/96 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="mx-auto grid max-w-3xl grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.55rem)]">
                <Link
                  href="/app-cliente/explorar"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-950 transition active:bg-zinc-100"
                  aria-label="Voltar"
                >
                  <ArrowLeft size={27} />
                </Link>

                <div className="min-w-0 px-1">
                  <p className="truncate text-[0.98rem] font-black tracking-[-0.035em] text-zinc-950">
                    Salão Premium
                  </p>
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-[#9b6a14]">
                    {salao.nome}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {hasSession ? (
                    <form action={toggleClienteSalonFavoriteAction}>
                      <input type="hidden" name="salao" value={salao.id} />
                      <input
                        type="hidden"
                        name="next_favorite"
                        value={String(!isFavorite)}
                      />
                      <button
                        type="submit"
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-950 shadow-sm transition hover:bg-zinc-100"
                        aria-label={isFavorite ? "Remover dos favoritos" : "Favoritar salão"}
                      >
                        <Heart
                          size={23}
                          fill={isFavorite ? "currentColor" : "none"}
                        />
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={favoriteLoginUrl}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-950 shadow-sm transition hover:bg-zinc-100"
                      aria-label="Entrar para favoritar"
                    >
                      <Heart size={23} />
                    </Link>
                  )}

                  <ClientSalonShareButton salonName={salao.nome} compact tone="light" />
                  <ClientAppDrawerNav />
                </div>
              </div>
            </header>
          </div>

          <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
            <div className="-mt-12 rounded-[2rem] bg-white px-5 pb-7 pt-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)] ring-1 ring-black/5 sm:px-7">
              <div className="flex items-start gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.45rem] border-4 border-white bg-zinc-100 text-3xl font-black shadow-lg sm:h-28 sm:w-28">
                  {salao.logoUrl ? (
                    <img
                      src={salao.logoUrl}
                      alt={`Logo de ${salao.nome}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    salao.nome.slice(0, 2).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="min-w-0 break-words text-[1.8rem] font-black leading-tight tracking-[-0.045em] sm:text-[2.2rem]">
                      {salao.nome}
                    </h1>
                    {salao.isPremium ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2d3] px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-[#8d6511]">
                        <Sparkles size={14} />
                        Salão Premium
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600">
                    {salao.totalAvaliacoes > 0 && salao.notaMedia !== null ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-zinc-900">
                        <Star size={17} className="text-[#d89a18]" fill="currentColor" />
                        {salao.notaMedia.toFixed(1)}
                        <span className="font-medium text-zinc-500">
                          ({salao.totalAvaliacoes} {salao.totalAvaliacoes === 1 ? "avaliação" : "avaliações"})
                        </span>
                      </span>
                    ) : (
                      <span className="font-semibold text-zinc-500">Ainda sem avaliações</span>
                    )}
                    <ClientSalonLiveDistance
                      latitude={salao.latitude}
                      longitude={salao.longitude}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {salao.horarioFuncionamento ? (
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-black">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          salao.horarioFuncionamento.abertoAgora
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                        }`}
                      />
                      {salao.horarioFuncionamento.abertoAgora
                        ? "Aberto agora"
                        : "Fechado agora"}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {formatWorkingDays(salao.horarioFuncionamento.diasFuncionamento)} · {salao.horarioFuncionamento.horaAbertura}–{salao.horarioFuncionamento.horaFechamento}
                    </p>
                  </div>
                ) : null}

                {salao.proximoHorario ? (
                  <Link
                    href={`${reserveUrl}?servico=${encodeURIComponent(
                      salao.proximoHorario.servicoId
                    )}&profissional=${encodeURIComponent(
                      salao.proximoHorario.profissionalId
                    )}`}
                    className="rounded-2xl bg-[#fff5df] p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-black text-[#8d6511]">
                      <Clock3 size={17} />
                      Próximo horário
                    </div>
                    <p className="mt-2 text-sm font-bold text-zinc-900">
                      {salao.proximoHorario.label}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {salao.proximoHorario.servicoNome}
                    </p>
                  </Link>
                ) : null}
              </div>

              {addressLabel ? (
                <div className="mt-5 flex items-start gap-3 text-sm leading-6 text-zinc-600">
                  <MapPin size={20} className="mt-0.5 shrink-0 text-zinc-900" />
                  <span>{addressLabel}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Link
                href={reserveUrl}
                className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#f6b93f] px-3 text-center text-sm font-black text-black shadow-sm"
              >
                <CalendarDays size={23} />
                Agendar
              </Link>

              {whatsUrl ? (
                <a
                  href={whatsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3 text-center text-sm font-bold"
                >
                  <MessageCircle size={23} />
                  WhatsApp
                </a>
              ) : null}

              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3 text-center text-sm font-bold"
                >
                  <Navigation size={23} />
                  Como chegar
                </a>
              ) : null}

              {hasSession ? (
                <form action={toggleClienteSalonFavoriteAction} className="contents">
                  <input type="hidden" name="salao" value={salao.id} />
                  <input
                    type="hidden"
                    name="next_favorite"
                    value={String(!isFavorite)}
                  />
                  <button
                    type="submit"
                    className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3 text-center text-sm font-bold"
                  >
                    <Heart size={23} fill={isFavorite ? "currentColor" : "none"} />
                    {isFavorite ? "Favoritado" : "Favoritar"}
                  </button>
                </form>
              ) : (
                <Link
                  href={favoriteLoginUrl}
                  className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3 text-center text-sm font-bold"
                >
                  <Heart size={23} />
                  Favoritar
                </Link>
              )}

              <ClientSalonShareButton salonName={salao.nome} />
            </div>

            {(phoneDigits || salao.instagramUrl) ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {phoneDigits ? (
                  <a
                    href={`tel:${phoneDigits}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-bold"
                  >
                    <Phone size={17} />
                    {salao.telefone}
                  </a>
                ) : null}
                {salao.instagramUrl ? (
                  <a
                    href={salao.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-bold"
                  >
                    <Camera size={17} />
                    Instagram
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="-mx-4 mt-7 bg-white sm:-mx-6">
              <ClientSalonSectionTabs salonId={id} active="servicos" stickyBelowHeader />
            </div>

            <section id="servicos" className="mt-7 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a6f12]">
                    Catálogo
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">
                    Serviços
                  </h2>
                </div>
                <Link href={reserveUrl} className="text-sm font-black text-[#9a6f12]">
                  Ver todos
                </Link>
              </div>

              {popularServices.length ? (
                <div className="mt-5 space-y-4">
                  {popularServices.map((servico) => {
                    const professionalNames = servico.profissionaisPermitidos
                      .map((professionalId) => professionalMap.get(professionalId))
                      .filter(Boolean)
                      .slice(0, 3) as string[];

                    return (
                      <article
                        key={servico.id}
                        className="overflow-hidden rounded-[1.35rem] border border-zinc-100 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:grid sm:grid-cols-[150px_1fr]"
                      >
                        {servico.imagemUrl ? (
                          <img
                            src={servico.imagemUrl}
                            alt={servico.nome}
                            className="h-40 w-full object-cover sm:h-full"
                          />
                        ) : (
                          <div className="flex h-32 items-center justify-center bg-gradient-to-br from-zinc-100 to-amber-50 text-[#9a6f12] sm:h-full">
                            <Scissors size={34} />
                          </div>
                        )}

                        <div className="p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-zinc-600">
                              {servico.categoriaNome}
                            </span>
                            <span className="text-xs font-semibold text-zinc-500">
                              {formatClientDuration(servico.duracaoMinutos)}
                            </span>
                          </div>
                          <h3 className="mt-2 text-lg font-black">{servico.nome}</h3>
                          {servico.descricao ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-500">
                              {servico.descricao}
                            </p>
                          ) : null}
                          <p className="mt-3 text-xl font-black">
                            {formatCurrency(servico.preco)}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            {professionalNames.length
                              ? `Com ${professionalNames.join(", ")}`
                              : "Escolha o profissional disponível na reserva"}
                          </p>
                          <Link
                            href={`${reserveUrl}?servico=${encodeURIComponent(servico.id)}`}
                            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-black text-white"
                          >
                            Agendar
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-5 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  O salão ainda não publicou serviços para agendamento online.
                </p>
              )}
            </section>

            {salao.profissionais.length ? (
              <section id="profissionais" className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
                <h2 className="text-2xl font-black tracking-[-0.035em]">Profissionais</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {salao.profissionais.slice(0, 6).map((profissional) => (
                    <article
                      key={profissional.id}
                      className="rounded-[1.35rem] border border-zinc-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-center gap-3">
                        {profissional.fotoUrl ? (
                          <img
                            src={profissional.fotoUrl}
                            alt={profissional.nome}
                            className="h-16 w-16 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-100">
                            <Scissors size={23} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black">{profissional.nome}</h3>
                          {profissional.especialidade ? (
                            <p className="truncate text-sm text-zinc-500">
                              {profissional.especialidade}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 min-h-5 text-sm text-zinc-600">
                        {profissional.totalAvaliacoes > 0 && profissional.notaMedia !== null ? (
                          <span className="inline-flex items-center gap-1 font-bold">
                            <Star size={15} className="text-[#d89a18]" fill="currentColor" />
                            {profissional.notaMedia.toFixed(1)} · {profissional.totalAvaliacoes} {profissional.totalAvaliacoes === 1 ? "avaliação" : "avaliações"}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Ainda sem avaliações individuais</span>
                        )}
                      </div>

                      {profissional.bio ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-500">
                          {profissional.bio}
                        </p>
                      ) : null}

                      <Link
                        href={`${reserveUrl}?profissional=${encodeURIComponent(
                          profissional.id
                        )}`}
                        className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-black"
                      >
                        Agendar com este profissional
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {salao.portfolio.length ? (
              <section className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a6f12]">
                      Trabalhos
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">Portfólio</h2>
                  </div>
                  <Link
                    href={`/app-cliente/salao/${id}/portfolio`}
                    className="text-sm font-black text-[#9a6f12]"
                  >
                    Ver completo
                  </Link>
                </div>
                <div className="mt-5">
                  <ClientSalonPortfolioGallery photos={salao.portfolio} />
                </div>
              </section>
            ) : null}

            <section className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a6f12]">
                    Experiências reais
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">Avaliações</h2>
                </div>
                {salao.totalAvaliacoes > 0 ? (
                  <Link
                    href={`/app-cliente/salao/${id}/avaliacoes`}
                    className="text-sm font-black text-[#9a6f12]"
                  >
                    Ver todas
                  </Link>
                ) : null}
              </div>

              {salao.totalAvaliacoes > 0 && salao.notaMedia !== null ? (
                <>
                  <div className="mt-5 grid gap-5 sm:grid-cols-[130px_1fr] sm:items-center">
                    <div className="text-center sm:text-left">
                      <div className="text-5xl font-black tracking-[-0.06em]">
                        {salao.notaMedia.toFixed(1)}
                      </div>
                      <div className="mt-2 flex justify-center gap-0.5 text-[#d89a18] sm:justify-start">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star key={index} size={17} fill="currentColor" />
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        {salao.totalAvaliacoes} {salao.totalAvaliacoes === 1 ? "avaliação" : "avaliações"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = salao.distribuicaoAvaliacoes[rating as 1 | 2 | 3 | 4 | 5];
                        const percent = salao.totalAvaliacoes
                          ? (count / salao.totalAvaliacoes) * 100
                          : 0;
                        return (
                          <div key={rating} className="grid grid-cols-[18px_1fr_30px] items-center gap-2 text-xs">
                            <span className="font-bold">{rating}</span>
                            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                              <div
                                className="h-full rounded-full bg-[#e2a52c]"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-right text-zinc-500">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {recentReviews.length ? (
                    <div className="mt-6 space-y-3">
                      {recentReviews.map((review) => (
                        <article key={review.id} className="rounded-2xl bg-zinc-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black">{review.clienteNome}</p>
                              <div className="mt-1 flex gap-0.5 text-[#d89a18]">
                                {Array.from({ length: review.nota }).map((_, index) => (
                                  <Star key={index} size={14} fill="currentColor" />
                                ))}
                              </div>
                            </div>
                            {reviewDate(review.createdAt) ? (
                              <span className="text-xs text-zinc-400">
                                {reviewDate(review.createdAt)}
                              </span>
                            ) : null}
                          </div>
                          {review.comentario ? (
                            <p className="mt-3 text-sm leading-6 text-zinc-700">
                              {review.comentario}
                            </p>
                          ) : null}
                          {review.imagensUrl.length ? (
                            <div className="mt-3 flex gap-2 overflow-x-auto">
                              {review.imagensUrl.map((url) => (
                                <img
                                  key={url}
                                  src={url}
                                  alt="Foto enviada na avaliação"
                                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                                />
                              ))}
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-5 rounded-2xl bg-zinc-50 p-5 text-center">
                  <Star className="mx-auto text-zinc-300" size={28} />
                  <p className="mt-2 font-bold text-zinc-700">Ainda não há avaliações publicadas.</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    A nota aparecerá aqui somente depois de avaliações reais de atendimentos.
                  </p>
                </div>
              )}
            </section>

            {(salao.descricaoPublica || salao.formasPagamento.length || amenities.length) ? (
              <section className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
                <h2 className="text-2xl font-black tracking-[-0.035em]">Sobre o salão</h2>

                {salao.descricaoPublica ? (
                  <p className="mt-4 text-[1rem] leading-7 text-zinc-700">
                    {salao.descricaoPublica}
                  </p>
                ) : null}

                {amenities.length ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {amenities.map((item) => {
                      const Icon = item.icon;
                      return (
                        <span
                          key={item.label}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-bold"
                        >
                          <Icon size={18} />
                          {item.label}
                        </span>
                      );
                    })}
                  </div>
                ) : null}

                {salao.formasPagamento.length ? (
                  <div className="mt-6 border-t border-zinc-100 pt-5">
                    <div className="flex items-center gap-2 font-black">
                      <CreditCard size={19} />
                      Formas de pagamento
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {salao.formasPagamento.map((method) => (
                        <span
                          key={method}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700"
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 backdrop-blur sm:px-6">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              {salao.proximoHorario ? (
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-zinc-400">
                    Próximo disponível
                  </p>
                  <p className="truncate text-sm font-black">{salao.proximoHorario.label}</p>
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">Agenda online</p>
                  <p className="truncate text-xs text-zinc-500">Escolha serviço, profissional e horário</p>
                </div>
              )}
              <Link
                href={reserveUrl}
                className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#f6b93f] px-6 text-base font-black text-black shadow-sm"
              >
                <CalendarDays size={22} />
                Agendar agora
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
