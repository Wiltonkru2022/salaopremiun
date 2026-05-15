import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
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
  title: "Salão",
};

function formatCurrency(value: number | null) {
  if (value === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

type ServiceRowProps = {
  servico: {
    id: string;
    nome: string;
    descricao: string | null;
    preco: number | null;
    duracaoMinutos: number | null;
    exigeAvaliacao: boolean;
    ehCombo?: boolean;
  };
};

function ServiceRow({ servico }: ServiceRowProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 py-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {servico.ehCombo ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
              Combo
            </span>
          ) : null}
          <div className="text-xl font-medium text-zinc-950">{servico.nome}</div>
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
            ? "Exige avaliação"
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
          Agendar
        </a>
      </div>
    </div>
  );
}

export default async function ClienteSalonPage({
  params,
  searchParams,
  publicOnly = false,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ status?: string }>;
  publicOnly?: boolean;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;

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
      "Salão pausado no momento. Assim que a agenda voltar, você poderá reservar por aqui.";
    const salaoPublicPath = buildSalaoPublicPath(
      salao.appClienteSlug || salao.id
    );
    const cover =
      salao.fotoCapaUrl ||
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1400&auto=format&fit=crop";
    const popularServices = salao.servicos.slice(0, 5);
    const otherServices = salao.servicos.slice(5);

    return (
      <ClientAppFrame title={salao.nome} subtitle="Agendamento online">
        <div className="bg-white">
          <section className="-mt-4">
            <div className="relative h-[360px] overflow-hidden bg-zinc-200 md:h-[460px]">
              <img
                src={cover}
                alt={`Capa do salão ${salao.nome}`}
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
                    "Endereço em atualização"}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-lg font-black text-zinc-950">
                    <Star size={18} fill="currentColor" />
                    {notaMedia ? notaMedia.toFixed(1) : "Novo"}
                  </span>
                  {!publicOnly ? (
                    <span className="font-bold text-amber-800">
                      ({salao.avaliacoes.length} avaliações)
                    </span>
                  ) : null}
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

          {!publicOnly ? (
            <ClientSalonSectionTabs salonId={id} active="servicos" />
          ) : null}

          {salaoPausado ? (
            <section className="px-4 py-5 md:px-6">
              <div className="mx-auto max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
                <h3 className="text-lg font-black">Salão pausado no momento</h3>
                <p className="mt-2 text-sm leading-6">{pausaMensagem}</p>
              </div>
            </section>
          ) : null}

          <section id="servicos" className="px-4 py-7 md:px-6">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_420px]">
              <div>
                {query?.status === "lista_espera" ? (
                  <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                    Pronto. Vamos avisar pelo app quando surgir uma vaga para essa escolha.
                  </div>
                ) : query?.status === "lista_espera_erro" ? (
                  <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    Não foi possível entrar na lista de espera agora. Tente novamente em instantes.
                  </div>
                ) : null}
                <h2 className="text-3xl font-black tracking-[-0.05em]">
                  Serviços populares
                </h2>
                <div className="mt-5 divide-y divide-zinc-100">
                  {salao.servicos.length ? (
                    popularServices.map((servico) => (
                      <ServiceRow key={servico.id} servico={servico} />
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-zinc-500">
                      Os serviços públicos aparecem aqui assim que o salão
                      liberar a vitrine.
                    </p>
                  )}
                </div>

                {otherServices.length ? (
                  <div className="mt-9">
                    <h2 className="text-3xl font-black tracking-[-0.05em]">
                      Outros serviços
                    </h2>
                    <div className="mt-5 divide-y divide-zinc-100">
                      {otherServices.map((servico) => (
                        <ServiceRow key={servico.id} servico={servico} />
                      ))}
                    </div>
                  </div>
                ) : null}
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
                    <h3 className="text-xl font-black">Reserva online</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Escolha seu atendimento, entre na sua conta e confirme o
                      melhor horário.
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
        </div>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
