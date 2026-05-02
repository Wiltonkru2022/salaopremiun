import Link from "next/link";
import {
  ArrowRight,
  CalendarPlus2,
  Clock3,
  MessageCircleQuestion,
  Receipt,
  Sparkles,
  UserPlus2,
} from "lucide-react";
import ProfissionalActionCard from "@/components/profissional/cards/ProfissionalActionCard";
import ProfissionalAppointmentCard from "@/components/profissional/cards/ProfissionalAppointmentCard";
import ProfissionalStatCard from "@/components/profissional/cards/ProfissionalStatCard";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalEmptyState from "@/components/profissional/ui/ProfissionalEmptyState";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { listarProximosAgendamentosProfissional } from "@/app/services/profissional/inicio";
import { buscarResumoInicioProfissional } from "@/app/services/profissional/resumo";
import { captureSystemError } from "@/lib/monitoring/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function traduzirStatus(status: string): "confirmado" | "pendente" {
  const valor = String(status || "").toLowerCase();

  if (valor === "confirmado") return "confirmado";
  if (valor === "atendido") return "confirmado";
  return "pendente";
}

function saudacao() {
  const hora = new Date().getHours();

  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function fallbackResumo() {
  return {
    atendimentosHoje: 0,
    atendimentosMes: 0,
    totalComissaoMes: 0,
  };
}

export default async function InicioProfissionalPage() {
  const session = await requireProfissionalAppContext();
  const [agendamentosResult, resumoResult] = await Promise.allSettled([
    listarProximosAgendamentosProfissional(
      session.idSalao,
      session.idProfissional
    ),
    buscarResumoInicioProfissional(session.idSalao, session.idProfissional),
  ]);

  if (agendamentosResult.status === "rejected") {
    await captureSystemError({
      module: "app_profissional",
      action: "carregar_inicio_agendamentos",
      surface: "app_profissional",
      route: "/app-profissional/inicio",
      screen: "inicio",
      idSalao: session.idSalao,
      error: agendamentosResult.reason,
      fallbackMessage: "Falha ao carregar agendamentos da home profissional.",
      createIncident: false,
      severity: "warning",
    });
  }

  if (resumoResult.status === "rejected") {
    await captureSystemError({
      module: "app_profissional",
      action: "carregar_inicio_resumo",
      surface: "app_profissional",
      route: "/app-profissional/inicio",
      screen: "inicio",
      idSalao: session.idSalao,
      error: resumoResult.reason,
      fallbackMessage: "Falha ao carregar resumo da home profissional.",
      createIncident: false,
      severity: "warning",
    });
  }

  const agendamentos =
    agendamentosResult.status === "fulfilled" ? agendamentosResult.value : [];
  const resumo =
    resumoResult.status === "fulfilled" ? resumoResult.value : fallbackResumo();
  const hasLoadWarning =
    agendamentosResult.status === "rejected" || resumoResult.status === "rejected";

  const proximosAgendamentos = agendamentos.slice(0, 4);
  const primeiroHorario = proximosAgendamentos[0]?.hora_inicio
    ? String(proximosAgendamentos[0].hora_inicio).slice(0, 5)
    : "Livre";

  return (
    <ProfissionalShell
      title="Inicio"
      subtitle={`${saudacao()}, ${session.nome}`}
    >
      <div className="space-y-3.5">
        {hasLoadWarning ? (
          <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800 shadow-sm">
            Parte dos dados do inicio nao carregou agora. O app continua funcionando
            e voce pode seguir para agenda, comandas e clientes.
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[1.35rem] bg-zinc-950 px-4 py-3.5 text-white shadow-[0_14px_30px_rgba(15,23,42,0.15)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                <Sparkles size={14} />
                Acesso ativo
              </div>

              <h2 className="mt-2.5 text-[1.42rem] font-black leading-none tracking-[-0.04em]">
                {session.nome}
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-300">
                Seu dia no salao, pronto para atender, abrir comandas e seguir
                a agenda sem perder tempo.
              </p>
            </div>

            <Link
              href="/app-profissional/perfil"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-950"
              aria-label="Abrir perfil"
            >
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="mt-3.5 grid grid-cols-3 gap-2">
            <div className="rounded-[18px] bg-white/10 p-2.5">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                Proximo
              </div>
              <div className="mt-1 text-lg font-bold">{primeiroHorario}</div>
            </div>

            <div className="rounded-[18px] bg-white/10 p-2.5">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                Hoje
              </div>
              <div className="mt-1 text-lg font-bold">
                {resumo.atendimentosHoje}
              </div>
            </div>

            <div className="rounded-[18px] bg-white/10 p-2.5">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                Mes
              </div>
              <div className="mt-1 text-lg font-bold">
                {resumo.atendimentosMes}
              </div>
            </div>
          </div>
        </section>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Acoes rapidas"
            description="Tudo o que voce mais usa no dia a dia."
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Link href="/app-profissional/clientes/novo" className="block">
              <ProfissionalActionCard
                icon={<UserPlus2 size={18} />}
                title="Cadastrar cliente"
                subtitle="Novo cadastro"
              />
            </Link>

            <Link href="/app-profissional/agenda/novo" className="block">
              <ProfissionalActionCard
                icon={<CalendarPlus2 size={18} />}
                title="Novo horario"
                subtitle="Abrir agenda"
              />
            </Link>

            <Link href="/app-profissional/comandas/nova" className="block">
              <ProfissionalActionCard
                icon={<Receipt size={18} />}
                title="Nova comanda"
                subtitle="Criar no app"
              />
            </Link>

            <Link href="/app-profissional/suporte" className="block">
              <ProfissionalActionCard
                icon={<MessageCircleQuestion size={18} />}
                title="Suporte"
                subtitle="Tirar duvidas"
              />
            </Link>
          </div>
        </ProfissionalSurface>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Agenda de hoje"
            description="Toque para abrir os detalhes do atendimento."
            action={
              <Link
                href="/app-profissional/agenda"
                className="text-sm font-bold text-[#b07b19]"
              >
                Ver agenda
              </Link>
            }
          />

          {proximosAgendamentos.length ? (
            <div className="space-y-3">
              {proximosAgendamentos.map((item) => (
                <Link
                  key={item.id}
                  href={`/app-profissional/agenda/${item.id}`}
                  className="block"
                >
                  <ProfissionalAppointmentCard
                    horario={String(item.hora_inicio).slice(0, 5)}
                    cliente={item.cliente_nome}
                    servico={item.servico_nome}
                    status={traduzirStatus(item.status)}
                  />
                </Link>
              ))}
            </div>
          ) : (
            <ProfissionalEmptyState
              title="Agenda livre por enquanto"
              description="Quando entrar um atendimento para hoje, ele aparece aqui."
              action={
                <Link
                  href="/app-profissional/agenda/novo"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white"
                >
                  Criar horario
                </Link>
              }
            />
          )}
        </ProfissionalSurface>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Resumo"
            description="Indicadores principais do seu dia."
          />

          <div className="grid grid-cols-2 gap-3">
            <ProfissionalStatCard
              label="Comissao do mes"
              value={formatarMoeda(resumo.totalComissaoMes)}
              helper="Valor acumulado"
            />

            <ProfissionalStatCard
              label="Atendimentos hoje"
              value={String(resumo.atendimentosHoje)}
              helper={`${resumo.atendimentosMes} no mes`}
            />
          </div>
        </ProfissionalSurface>

        <ProfissionalSurface className="mb-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Clock3 size={18} />
            </div>

            <div className="min-w-0">
              <div className="text-base font-bold tracking-[-0.02em] text-zinc-950">
                Precisa de ajuda?
              </div>
              <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                Use o suporte para login, agenda, comandas, caixa e duvidas
                operacionais do app profissional.
              </p>
              <Link
                href="/app-profissional/suporte"
                className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold text-zinc-800"
              >
                Abrir suporte
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </ProfissionalSurface>
      </div>
    </ProfissionalShell>
  );
}
