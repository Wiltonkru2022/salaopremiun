import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Star,
} from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientBookingForm from "@/components/client-app/ClientBookingForm";
import ClientSalonHeaderActions from "@/components/client-app/ClientSalonHeaderActions";
import ClientSalonSectionTabs from "@/components/client-app/ClientSalonSectionTabs";
import {
  getClientAppSalonDetail,
  isClienteAppSalonFavorite,
} from "@/lib/client-app/queries";
import { validateClienteAppSession } from "@/lib/client-context.server";
import { buildSalaoPublicPath } from "@/lib/saloes/public-link";

export const metadata = {
  title: "Salao | SalaoPremium",
};

function formatCurrency(value: number | null) {
  if (value === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function normalizePhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

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

function RatingStars({ nota }: { nota: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={15}
          fill={index < Math.round(nota) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
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
      : null;
    const salaoPausado = salao.appClientePausado;
    const pausaMensagem =
      salao.appClientePausaMensagem ||
      "Salao pausado no momento. Assim que a agenda voltar, voce podera reservar por aqui.";
    const salaoPublicPath = buildSalaoPublicPath(
      salao.appClienteSlug || salao.id
    );
    const cover =
      salao.fotoCapaUrl ||
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1400&auto=format&fit=crop";
    const phone = normalizePhone(salao.whatsapp || salao.telefone);
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

    return (
      <ClientAppFrame title={salao.nome} subtitle="Agendamento online">
        <div className="bg-white">
          <section className="-mt-4">
            <div className="relative h-[360px] overflow-hidden bg-zinc-200 md:h-[460px]">
              <img
                src={cover}
                alt={`Capa do salao ${salao.nome}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/35" />

              <div className="absolute left-4 right-4 top-5 flex items-center justify-between">
                <Link
                  href="/app-cliente/inicio"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 text-zinc-950 shadow-xl"
                  aria-label="Voltar"
                >
                  <ArrowLeft size={24} />
                </Link>
                <ClientSalonHeaderActions
                  idSalao={salao.id}
                  salaoNome={salao.nome}
                  publicPath={salaoPublicPath}
                  initialFavorite={isFavorite}
                  canFavorite={hasSession}
                />
              </div>
            </div>

            <div className="px-4 py-6 md:px-6">
              <div className="mx-auto max-w-6xl">
                <h1 className="text-4xl font-black uppercase tracking-[-0.04em] text-zinc-800">
                  {salao.nome}
                </h1>
                <p className="mt-3 text-base leading-6 text-zinc-500">
                  {salao.enderecoCompleto ||
                    [salao.bairro, salao.cidade, salao.estado]
                      .filter(Boolean)
                      .join(" - ") ||
                    "Endereco em atualizacao"}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-lg font-black text-zinc-950">
                    <Star size={18} fill="currentColor" />
                    {notaMedia ? notaMedia.toFixed(1) : "Novo"}
                  </span>
                  <span className="font-bold text-amber-800">
                    ({salao.avaliacoes.length} avaliacoes)
                  </span>
                  <span className="text-zinc-400">Agendamento online</span>
                </div>

                {salao.descricaoPublica ? (
                  <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600">
                    {salao.descricaoPublica}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <ClientSalonSectionTabs salonId={id} active="servicos" />

          {salaoPausado ? (
            <section className="px-4 py-5 md:px-6">
              <div className="mx-auto max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
                <h3 className="text-lg font-black">Salao pausado no momento</h3>
                <p className="mt-2 text-sm leading-6">{pausaMensagem}</p>
              </div>
            </section>
          ) : null}

          <section id="servicos" className="px-4 py-7 md:px-6">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_420px]">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.05em]">
                  Servicos populares
                </h2>
                <div className="mt-5 divide-y divide-zinc-100">
                  {salao.servicos.length ? (
                    salao.servicos.map((servico) => (
                      <div
                        key={servico.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-4 py-5"
                      >
                        <div>
                          <div className="text-xl font-medium text-zinc-950">
                            {servico.nome}
                          </div>
                          {servico.descricao ? (
                            <p className="mt-1 text-sm leading-6 text-zinc-500">
                              {servico.descricao}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-zinc-950">
                            {servico.exigeAvaliacao
                              ? "A avaliar"
                              : formatCurrency(servico.preco)}
                          </div>
                          <div className="mt-1 text-sm text-zinc-500">
                            {servico.duracaoMinutos
                              ? `${servico.duracaoMinutos} min`
                              : "Tempo sob consulta"}
                          </div>
                          <a
                            href="#agendar"
                            className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-black text-white"
                          >
                            Reservar
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-zinc-500">
                      Os servicos publicos aparecem aqui assim que o salao liberar
                      a vitrine.
                    </p>
                  )}
                </div>
              </div>

              <aside id="agendar" className="lg:sticky lg:top-20 lg:self-start">
                {hasSession ? (
                  <ClientBookingForm
                    idSalao={salao.id}
                    servicos={salao.servicos}
                    profissionais={salao.profissionais}
                    intervaloMinutos={salao.intervaloAgendaMinutos}
                  />
                ) : (
                  <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5">
                    <h3 className="text-xl font-black">Entre para reservar</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Depois do login voce volta para esta pagina e escolhe seu
                      horario.
                    </p>
                    <Link
                      href={`/app-cliente/login?salao=${encodeURIComponent(
                        salao.appClienteSlug || salao.id
                      )}&next=${encodeURIComponent(salaoPublicPath)}`}
                      className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-black text-white"
                    >
                      Entrar ou criar conta
                    </Link>
                  </div>
                )}
              </aside>
            </div>
          </section>

          <section
            id="avaliacoes"
            className="border-t border-zinc-200 px-4 py-8 md:px-6"
          >
            <div className="mx-auto max-w-6xl">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="grid gap-6 md:grid-cols-[260px_1fr]">
                  <div className="text-center">
                    <div className="text-6xl font-light text-zinc-700">
                      {notaMedia ? notaMedia.toFixed(1) : "0,0"}
                      <span className="text-2xl">/5</span>
                    </div>
                    <div className="mt-3">
                      <RatingStars nota={notaMedia || 0} />
                    </div>
                    <div className="mt-2 text-zinc-500">
                      {salao.avaliacoes.length} avaliacoes
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((nota) => {
                      const count = salao.avaliacoes.filter(
                        (avaliacao) => Math.round(avaliacao.nota) === nota
                      ).length;
                      const percent = salao.avaliacoes.length
                        ? (count / salao.avaliacoes.length) * 100
                        : 0;
                      return (
                        <div
                          key={nota}
                          className="grid grid-cols-[20px_1fr_30px] items-center gap-3 text-sm text-zinc-500"
                        >
                          <span>{nota}</span>
                          <div className="h-1.5 rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-7 space-y-5">
                <h2 className="text-3xl font-black tracking-[-0.05em]">
                  Avaliacoes ({salao.avaliacoes.length})
                </h2>
                {salao.avaliacoes.length ? (
                  salao.avaliacoes.map((avaliacao) => (
                    <article
                      key={avaliacao.id}
                      className="border-b border-zinc-200 pb-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-bold text-zinc-950">
                            {avaliacao.clienteNome}
                          </div>
                          <div className="mt-1">
                            <RatingStars nota={avaliacao.nota} />
                          </div>
                          <div className="mt-1 text-sm text-zinc-400">
                            {formatDate(avaliacao.createdAt)}
                          </div>
                        </div>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                          Cliente confirmado
                        </span>
                      </div>
                      {avaliacao.comentario ? (
                        <p className="mt-3 text-lg leading-7 text-zinc-700">
                          {avaliacao.comentario}
                        </p>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-zinc-500">
                    As avaliacoes reais entram aqui depois dos primeiros
                    atendimentos confirmados.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section
            id="portfolio"
            className="border-t border-zinc-200 px-4 py-10 md:px-6"
          >
            <div className="mx-auto max-w-6xl">
              <h2 className="text-3xl font-black tracking-[-0.05em]">
                Portfolio
              </h2>
              {salao.portfolio.length ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {salao.portfolio.map((foto, index) => (
                    <figure
                      key={foto.id}
                      className={`group overflow-hidden rounded-[1.75rem] bg-zinc-100 ${
                        index === 0 ? "sm:col-span-2 sm:row-span-2" : ""
                      }`}
                    >
                      <img
                        src={foto.imagemUrl}
                        alt={foto.legenda || `Foto do portfolio de ${salao.nome}`}
                        className={`w-full object-cover transition duration-500 group-hover:scale-105 ${
                          index === 0 ? "h-[420px]" : "h-64"
                        }`}
                      />
                      {foto.legenda ? (
                        <figcaption className="border-x border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-600">
                          {foto.legenda}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="mt-20 text-center text-zinc-500">
                  <div className="mx-auto mb-5 h-24 w-36 rounded-2xl border border-zinc-200 bg-zinc-50" />
                  <div className="text-2xl text-zinc-950">Nenhuma foto ainda</div>
                  <p className="mt-2 text-lg">
                    Volte em breve para ver imagens dos trabalhos do salao.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section
            id="detalhes"
            className="border-t border-zinc-200 px-4 py-8 md:px-6"
          >
            <div className="mx-auto max-w-6xl">
              <h2 className="text-2xl font-black uppercase tracking-[-0.02em]">
                Contato e horario de funcionamento
              </h2>
              <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="relative h-56 bg-zinc-100">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#f4f1ea,#e5e7eb)]" />
                  <MapPin
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-zinc-950"
                    size={52}
                    fill="currentColor"
                  />
                  <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white p-4 shadow-xl">
                    <div className="font-black text-zinc-950">{salao.nome}</div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {salao.enderecoCompleto || "Endereco em atualizacao"}
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-zinc-100">
                  <div className="flex items-center justify-between px-4 py-5">
                    <span className="text-zinc-500">
                      {abertoHoje ? "Aberto hoje" : "Fechado hoje"}
                    </span>
                    <span className="font-black text-zinc-950">
                      {abertoHoje ? horarioLabel : diasLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-4 py-5">
                    <span className="text-zinc-500">Funcionamento</span>
                    <span className="max-w-[68%] text-right font-semibold text-zinc-950">
                      {diasLabel}
                    </span>
                  </div>
                  {phone ? (
                    <div className="flex items-center justify-between gap-4 px-4 py-5">
                      <div className="flex min-w-0 items-center gap-3 text-lg">
                        <Phone size={22} className="shrink-0 text-zinc-400" />
                        <span className="truncate">
                          {salao.telefone || salao.whatsapp}
                        </span>
                      </div>
                      <a
                        href={`tel:+${phone}`}
                        className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-black"
                      >
                        Ligar
                      </a>
                    </div>
                  ) : null}
                  {phone ? (
                    <a
                      href={`https://wa.me/${phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between px-4 py-5 text-lg"
                    >
                      <span className="inline-flex items-center gap-3">
                        <MessageCircle size={22} className="text-zinc-400" />
                        WhatsApp
                      </span>
                      <span className="text-zinc-300">{">"}</span>
                    </a>
                  ) : null}
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between px-4 py-5 text-lg"
                    >
                      <span className="inline-flex items-center gap-3">
                        <Navigation size={22} className="text-zinc-400" />
                        Abrir rota no mapa
                      </span>
                      <span className="text-zinc-300">{">"}</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
