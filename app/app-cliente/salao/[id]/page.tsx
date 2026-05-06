import { notFound } from "next/navigation";
import { CalendarClock, MapPin, ParkingCircle, Star, Wallet } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { getClientAppSalonDetail } from "@/lib/client-app/queries";
import ClientBookingForm from "@/components/client-app/ClientBookingForm";
import { validateClienteAppSession } from "@/lib/client-context.server";

function formatCurrency(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
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
    const notaMedia = salao.avaliacoes.length
      ? salao.avaliacoes.reduce((sum, item) => sum + item.nota, 0) /
        salao.avaliacoes.length
      : null;

    return (
      <ClientAppFrame title={salao.nome} subtitle="Agendamento online">
        <div className="space-y-4">
          <section className="overflow-hidden rounded-[1.6rem] border border-white/70 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <div className="relative h-64 bg-zinc-100 md:h-80">
              {salao.fotoCapaUrl ? (
                <img
                  src={salao.fotoCapaUrl}
                  alt={`Capa do salao ${salao.nome}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full bg-gradient-to-br from-zinc-950 via-zinc-800 to-amber-700" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 pb-8 text-white md:p-7 md:pb-10">
                <div className="ml-24 md:ml-28">
                  <div className="min-w-0">
                    <h2 className="text-[2rem] font-black leading-none drop-shadow md:text-[2.6rem]">
                      {salao.nome}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-white/90">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                        <MapPin size={15} />
                        {[salao.bairro, salao.cidade].filter(Boolean).join(" - ") ||
                          "Endereco em atualizacao"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                        <Star size={15} fill="currentColor" />
                        {notaMedia ? notaMedia.toFixed(1) : "Novo"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative space-y-5 p-5 pt-0">
              <div className="flex flex-wrap items-end gap-4">
                <div className="-mt-12 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] border-4 border-white bg-zinc-100 text-3xl font-black text-zinc-950 shadow-xl md:h-28 md:w-28">
                  {salao.logoUrl ? (
                    <img
                      src={salao.logoUrl}
                      alt={`Logo do salao ${salao.nome}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    salao.nome.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-2">
                  <h1 className="text-2xl font-black text-zinc-950 md:hidden">
                    {salao.nome}
                  </h1>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600">
                    {salao.descricaoPublica ||
                      "Conheca equipe, servicos e avaliacoes deste salao antes de agendar."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-semibold text-zinc-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                  <Star size={14} fill="currentColor" />
                  {notaMedia ? notaMedia.toFixed(1) : "Novo"}
                  {salao.avaliacoes.length ? ` (${salao.avaliacoes.length})` : ""}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5">
                  <CalendarClock size={14} />
                  {salao.servicos.length ? "Agenda online" : "Agenda em publicacao"}
                </span>
                {salao.estacionamento ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                    <ParkingCircle size={14} />
                    Estacionamento
                  </span>
                ) : null}
                {salao.enderecoCompleto ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5">
                    <MapPin size={14} />
                    {salao.enderecoCompleto}
                  </span>
                ) : null}
                {salao.formasPagamento.length ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5">
                    <Wallet size={14} />
                    {salao.formasPagamento.join(" - ")}
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
                Agendamento online
              </h3>
              {hasSession ? (
                <div className="mt-4">
                  <ClientBookingForm
                    idSalao={salao.id}
                    servicos={salao.servicos}
                    profissionais={salao.profissionais}
                    intervaloMinutos={salao.intervaloAgendaMinutos}
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
                  Entre pelo menu Perfil para liberar a escolha de servico,
                  profissional e horario.
                </div>
              )}
            </div>

            <div className="rounded-[1.8rem] border border-white/70 bg-zinc-950 p-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-black">Escolha e confirme</h3>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="font-bold">1. Servico</div>
                  <div className="mt-1 text-white/70">Veja valor, tempo e equipe.</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="font-bold">2. Horario</div>
                  <div className="mt-1 text-white/70">O app mostra os proximos encaixes.</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="font-bold">3. Acompanhe</div>
                  <div className="mt-1 text-white/70">Tudo fica em Agenda no menu inferior.</div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1.1fr]">
            <div className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
                Profissionais
              </h3>
              <div className="mt-4 space-y-3">
                {salao.profissionais.length ? (
                  salao.profissionais.map((profissional) => (
                    <div
                      key={profissional.id}
                      className="flex items-start gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
                        {profissional.fotoUrl ? (
                          <img
                            src={profissional.fotoUrl}
                            alt={profissional.nome}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-black text-zinc-700">
                            {profissional.nome.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-zinc-900">
                          {profissional.nome}
                        </div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                          {profissional.especialidade || "Atendimento do salao"}
                        </div>
                        {profissional.bio ? (
                          <p className="mt-1 text-sm leading-6 text-zinc-500">
                            {profissional.bio}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-zinc-500">
                    Os profissionais visiveis no app cliente entram aqui assim que
                    o salao terminar a publicacao.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
                Servicos
              </h3>
              <div className="mt-4 space-y-3">
                {salao.servicos.length ? (
                  salao.servicos.map((servico) => (
                    <div
                      key={servico.id}
                      className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-zinc-900">
                            {servico.nome}
                          </div>
                          {servico.descricao ? (
                            <p className="mt-1 text-sm leading-6 text-zinc-500">
                              {servico.descricao}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right text-sm font-bold text-zinc-900">
                          {servico.exigeAvaliacao
                            ? "Exige avaliacao"
                            : formatCurrency(servico.preco) || "Sob consulta"}
                          <div className="mt-1 text-xs font-medium text-zinc-500">
                            {servico.duracaoMinutos
                              ? `${servico.duracaoMinutos} min`
                              : "Tempo sob consulta"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-zinc-500">
                    Os servicos publicos aparecem aqui assim que o salao liberar a
                    vitrine do app cliente.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
                Avaliacoes
              </h3>
              <div className="mt-4 space-y-3">
                {salao.avaliacoes.length ? (
                  salao.avaliacoes.map((avaliacao) => (
                    <div
                      key={avaliacao.id}
                      className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold text-zinc-900">
                          {avaliacao.clienteNome}
                        </div>
                        <div className="text-sm font-bold text-amber-700">
                          {avaliacao.nota}/5
                        </div>
                      </div>
                      {avaliacao.comentario ? (
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          {avaliacao.comentario}
                        </p>
                      ) : null}
                      <div className="mt-2 text-xs text-zinc-400">
                        {formatDate(avaliacao.createdAt)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-zinc-500">
                    As avaliacoes reais entram aqui depois dos primeiros
                    atendimentos confirmados no app cliente.
                  </p>
                )}
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
