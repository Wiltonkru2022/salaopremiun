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
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalActionCard from "@/components/profissional/cards/ProfissionalActionCard";
import ProfissionalAppointmentCard from "@/components/profissional/cards/ProfissionalAppointmentCard";
import ProfissionalStatCard from "@/components/profissional/cards/ProfissionalStatCard";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { listarProximosAgendamentosProfissional } from "@/app/services/profissional/inicio";
import { buscarResumoInicioProfissional } from "@/app/services/profissional/resumo";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function traduzirStatus(status: string): "confirmado" | "pendente" {
  const valor = String(status || "").toLowerCase();

  if (valor === "confirmado") return "confirmado";
  if (valor === "pendente") return "pendente";
  if (valor === "atendido") return "confirmado";

  return "pendente";
}

function saudacao() {
  const hora = new Date().getHours();

  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function InicioProfissionalPage() {
  const session = await requireProfissionalAppContext();

  const [agendamentos, resumo] = await Promise.all([
    listarProximosAgendamentosProfissional(
      session.idSalao,
      session.idProfissional
    ),
    buscarResumoInicioProfissional(session.idSalao, session.idProfissional),
  ]);

  const proximosAgendamentos = agendamentos.slice(0, 4);
  const primeiroHorario = proximosAgendamentos[0]?.hora_inicio
    ? String(proximosAgendamentos[0].hora_inicio).slice(0, 5)
    : "Livre";

  return (
    <ProfissionalShell
      title="Início"
      subtitle={`${saudacao()}, ${session.nome}`}
    >
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[1.75rem] bg-zinc-950 p-4 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100">
                <Sparkles size={14} />
                Acesso ativo
              </div>

              <h2 className="mt-4 text-[1.55rem] font-semibold leading-tight">
                {session.nome}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Seu dia no salão, pronto para atendimento.
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

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-xs text-zinc-400">Próximo</div>
              <div className="mt-1 text-lg font-semibold">{primeiroHorario}</div>
            </div>

            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-xs text-zinc-400">Hoje</div>
              <div className="mt-1 text-lg font-semibold">
                {resumo.atendimentosHoje}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-xs text-zinc-400">Mês</div>
              <div className="mt-1 text-lg font-semibold">
                {resumo.atendimentosMes}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">
              Ações rápidas
            </h2>

            <span className="text-xs text-zinc-500">Toque e resolva</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/app-profissional/clientes/novo" className="block">
              <ProfissionalActionCard
                icon={<UserPlus2 size={18} />}
                title="Cadastrar cliente"
                subtitle="Novo cadastro"
              />
            </Link>

            <Link href="/app-profissional/agenda" className="block">
              <ProfissionalActionCard
                icon={<CalendarPlus2 size={18} />}
                title="Agendar cliente"
                subtitle="Novo horário"
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
                subtitle="Tire dúvidas"
              />
            </Link>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">
              Agenda de hoje
            </h2>

            <Link
              href="/app-profissional/agenda"
              className="text-xs font-medium text-[#b07b19]"
            >
              Ver agenda
            </Link>
          </div>

          <div className="space-y-3">
            {proximosAgendamentos.length ? (
              proximosAgendamentos.map((item) => (
                <ProfissionalAppointmentCard
                  key={item.id}
                  horario={String(item.hora_inicio).slice(0, 5)}
                  cliente={item.cliente_nome}
                  servico={item.servico_nome}
                  status={traduzirStatus(item.status)}
                />
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Clock3 size={18} />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-zinc-900">
                      Agenda livre por enquanto
                    </div>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Quando chegar um atendimento, ele aparece aqui.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 text-sm font-semibold text-zinc-700">
            Resumo do dia
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ProfissionalStatCard
              label="Comissão do mês"
              value={formatarMoeda(resumo.totalComissaoMes)}
              helper="Valor acumulado"
            />

            <ProfissionalStatCard
              label="Atendimentos hoje"
              value={String(resumo.atendimentosHoje)}
              helper={`${resumo.atendimentosMes} no mês`}
            />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">
            Precisa de ajuda?
          </div>

          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Use o suporte para tirar dúvidas sobre login, agenda, comandas,
            faturamento e funcionamento do app profissional.
          </p>

          <Link
            href="/app-profissional/suporte"
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-800"
          >
            Abrir suporte
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </ProfissionalShell>
  );
}
