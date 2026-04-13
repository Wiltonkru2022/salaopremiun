import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarPlus2,
  MessageCircleQuestion,
  Receipt,
  UserPlus2,
} from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalActionCard from "@/components/profissional/cards/ProfissionalActionCard";
import ProfissionalAppointmentCard from "@/components/profissional/cards/ProfissionalAppointmentCard";
import ProfissionalStatCard from "@/components/profissional/cards/ProfissionalStatCard";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
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
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  const [agendamentos, resumo] = await Promise.all([
    listarProximosAgendamentosProfissional(
      session.idSalao,
      session.idProfissional
    ),
    buscarResumoInicioProfissional(
      session.idSalao,
      session.idProfissional
    ),
  ]);

  const proximosAgendamentos = agendamentos.slice(0, 4);

  return (
    <ProfissionalShell
      title="Início"
      subtitle={`${saudacao()}, ${session.nome}`}
    >
      <div className="space-y-5">
        <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Profissional vinculado
          </div>

          <div className="mt-2 text-[1.35rem] font-semibold leading-tight text-zinc-950">
            {session.nome}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Acesso ativo
            </span>
            <span className="text-xs text-zinc-500">
              App profissional conectado ao seu salão
            </span>
          </div>
        </section>

        <section>
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Ações rápidas
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

            <Link href="/app-profissional/comandas" className="block">
              <ProfissionalActionCard
                icon={<Receipt size={18} />}
                title="Comandas"
                subtitle="Abertas e itens"
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
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
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
              <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 text-sm text-zinc-500 shadow-sm">
                Nenhum agendamento encontrado para hoje.
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
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
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Dica rápida
          </div>

          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Use o suporte para tirar dúvidas sobre login, agenda, comandas,
            faturamento e funcionamento do app profissional.
          </p>

          <Link
            href="/app-profissional/suporte"
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-800"
          >
            Abrir suporte
          </Link>
        </section>
      </div>
    </ProfissionalShell>
  );
}