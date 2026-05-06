import Link from "next/link";
import {
  ArrowLeft,
  CalendarPlus2,
  Mail,
  Phone,
  Receipt,
  UserRound,
} from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalEmptyState from "@/components/profissional/ui/ProfissionalEmptyState";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalStatusPill from "@/components/profissional/ui/ProfissionalStatusPill";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

type Params = Promise<{ id: string }>;

type ClienteRow = {
  id: string;
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  observacoes?: string | null;
  ativo?: boolean | string | number | null;
  status?: string | null;
};

type AgendamentoResumo = {
  id: string;
  data?: string | null;
  hora_inicio?: string | null;
  status?: string | null;
  servicos?: { nome?: string | null } | { nome?: string | null }[] | null;
};

type ComandaResumo = {
  id: string;
  numero?: number | string | null;
  total?: number | string | null;
  status?: string | null;
};

function formatTelefone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "Sem telefone";
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  return value || "Sem telefone";
}

function formatDate(value?: string | null) {
  if (!value) return "Data nao informada";

  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

function formatMoney(value?: number | string | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function getStatusLabel(status?: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "confirmado") return "Confirmado";
  if (value === "em_atendimento") return "Em atendimento";
  if (value === "atendido") return "Atendido";
  if (value === "aguardando_pagamento") return "Aguardando pagamento";
  if (value === "cancelado") return "Cancelado";
  if (value === "faltou") return "Nao compareceu";
  if (value === "pendente") return "Pendente de confirmacao";

  return status || "Pendente de confirmacao";
}

function getStatusTone(status?: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "confirmado" || value === "atendido") return "success" as const;
  if (value === "em_atendimento") return "info" as const;
  if (value === "cancelado" || value === "faltou") return "danger" as const;

  return "warning" as const;
}

function getServicoNome(
  servicos: { nome?: string | null } | { nome?: string | null }[] | null | undefined
) {
  if (Array.isArray(servicos)) return servicos[0]?.nome || "Servico";
  return servicos?.nome || "Servico";
}

export default async function ClienteDetalheProfissionalPage({
  params,
}: {
  params: Params;
}) {
  const session = await requireProfissionalAppContext();
  const { id } = await params;

  const { cliente, agendamentos, comandas } = await runAdminOperation({
    action: "app_profissional_cliente_detalhe_page",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabase) => {
      const [
        { data: clienteData, error: clienteError },
        { data: agendamentosData, error: agendamentosError },
        { data: comandasData, error: comandasError },
      ] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome, telefone, email, observacoes, ativo, status")
          .eq("id", id)
          .eq("id_salao", session.idSalao)
          .maybeSingle(),
        supabase
          .from("agendamentos")
          .select("id, data, hora_inicio, status, servicos ( nome )")
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", session.idProfissional)
          .eq("cliente_id", id)
          .order("data", { ascending: false })
          .order("hora_inicio", { ascending: false })
          .limit(4),
        supabase
          .from("comandas")
          .select("id, numero, total, status")
          .eq("id_salao", session.idSalao)
          .eq("id_cliente", id)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      if (clienteError) throw new Error(clienteError.message);
      if (agendamentosError) throw new Error(agendamentosError.message);
      if (comandasError) throw new Error(comandasError.message);

      return {
        cliente: clienteData as ClienteRow | null,
        agendamentos: (agendamentosData || []) as AgendamentoResumo[],
        comandas: (comandasData || []) as ComandaResumo[],
      };
    },
  });

  if (!cliente) {
    return (
      <ProfissionalShell title="Cliente" subtitle="Detalhes">
        <div className="space-y-4 pb-24">
          <Link
            href="/app-profissional/clientes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700"
          >
            <ArrowLeft size={18} />
            Voltar para clientes
          </Link>

          <ProfissionalEmptyState
            title="Cliente nao encontrado"
            description="Esse cadastro nao foi localizado no seu salao."
            action={
              <Link
                href="/app-profissional/clientes"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white"
              >
                Ver lista de clientes
              </Link>
            }
          />
        </div>
      </ProfissionalShell>
    );
  }

  return (
    <ProfissionalShell title="Cliente" subtitle="Detalhes do cadastro">
      <div className="space-y-3.5 pb-20">
        <Link
          href="/app-profissional/clientes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700"
        >
          <ArrowLeft size={18} />
          Voltar para clientes
        </Link>

        <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                <UserRound size={14} />
                Cadastro ativo
              </div>
              <h1 className="mt-3 text-[1.45rem] font-black tracking-[-0.04em] leading-none">
                {cliente.nome || "Cliente"}
              </h1>
              <p className="mt-2.5 text-sm leading-6 text-zinc-300">
                Acesse rapidamente os dados de contato e siga para agenda ou comanda.
              </p>
            </div>

            <ProfissionalStatusPill
              label={String(cliente.status || "Ativo")}
              tone={String(cliente.status || "").toLowerCase() === "ativo" ? "success" : "neutral"}
            />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/app-profissional/agenda/novo?cliente_id=${cliente.id}`}
            className="flex min-h-[84px] flex-col justify-between rounded-[1.25rem] border border-zinc-200 bg-white p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
          >
            <CalendarPlus2 size={18} className="text-zinc-700" />
            <div>
              <div className="text-sm font-bold text-zinc-950">Novo agendamento</div>
              <div className="mt-1 text-xs text-zinc-500">Ja entra com o cliente preenchido</div>
            </div>
          </Link>

          <Link
            href={`/app-profissional/comandas/nova?cliente_id=${cliente.id}`}
            className="flex min-h-[84px] flex-col justify-between rounded-[1.25rem] border border-zinc-200 bg-white p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
          >
            <Receipt size={18} className="text-zinc-700" />
            <div>
              <div className="text-sm font-bold text-zinc-950">Nova comanda</div>
              <div className="mt-1 text-xs text-zinc-500">Abrir atendimento direto no app</div>
            </div>
          </Link>
        </div>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Contato"
            description="Dados principais para confirmar o atendimento."
          />

          <div className="space-y-2.5">
            <div className="flex items-start gap-3 rounded-[1.05rem] border border-zinc-200 bg-zinc-50/80 p-3.5">
              <Phone size={16} className="mt-0.5 shrink-0 text-zinc-500" />
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
                  Telefone
                </div>
                <div className="mt-1 text-sm font-medium text-zinc-900">
                  {formatTelefone(cliente.telefone)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-[1.05rem] border border-zinc-200 bg-zinc-50/80 p-3.5">
              <Mail size={16} className="mt-0.5 shrink-0 text-zinc-500" />
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
                  Email
                </div>
                <div className="mt-1 truncate text-sm font-medium text-zinc-900">
                  {cliente.email || "Sem email informado"}
                </div>
              </div>
            </div>
          </div>
        </ProfissionalSurface>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Ultimos agendamentos"
            description="Historico recente desse cliente com voce."
          />

          {agendamentos.length ? (
            <div className="space-y-2.5">
              {agendamentos.map((agendamento) => (
                <Link
                  key={agendamento.id}
                  href={`/app-profissional/agenda/${agendamento.id}`}
                  className="block rounded-[1.15rem] border border-zinc-200 bg-zinc-50/70 p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-zinc-950">
                        {formatDate(agendamento.data)} - {String(agendamento.hora_inicio || "").slice(0, 5)}
                      </div>
                      <div className="mt-1 text-sm text-zinc-500">
                        {getServicoNome(agendamento.servicos)}
                      </div>
                    </div>
                    <ProfissionalStatusPill
                      label={getStatusLabel(agendamento.status)}
                      tone={getStatusTone(agendamento.status)}
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.15rem] border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-4 text-center text-sm text-zinc-500">
              Ainda nao existe agendamento desse cliente com este profissional.
            </div>
          )}
        </ProfissionalSurface>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Ultimas comandas"
            description="Historico recente para retomar atendimento mais rapido."
          />

          {comandas.length ? (
            <div className="space-y-2.5">
              {comandas.map((comanda) => (
                <Link
                  key={comanda.id}
                  href={`/app-profissional/comandas/${comanda.id}`}
                  className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-zinc-200 bg-zinc-50/70 p-3.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-zinc-950">
                      Comanda #{comanda.numero || "-"}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {formatMoney(comanda.total)}
                    </div>
                  </div>
                  <ProfissionalStatusPill
                    label={getStatusLabel(comanda.status)}
                    tone={getStatusTone(comanda.status)}
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.15rem] border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-4 text-center text-sm text-zinc-500">
              Nenhuma comanda vinculada a este cliente por enquanto.
            </div>
          )}
        </ProfissionalSurface>

        {cliente.observacoes ? (
          <ProfissionalSurface>
            <ProfissionalSectionHeader
              title="Observacoes"
              description="Notas registradas no cadastro."
            />
            <div className="rounded-[1.1rem] border border-zinc-200 bg-zinc-50/80 p-3.5 text-sm leading-6 text-zinc-600">
              {cliente.observacoes}
            </div>
          </ProfissionalSurface>
        ) : null}
      </div>
    </ProfissionalShell>
  );
}
