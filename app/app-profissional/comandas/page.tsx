import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalEmptyState from "@/components/profissional/ui/ProfissionalEmptyState";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalStatusPill from "@/components/profissional/ui/ProfissionalStatusPill";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { listarComandasProfissional } from "@/app/services/profissional/comandas";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function getStatusMeta(status: string) {
  const value = String(status || "").toLowerCase();

  if (value === "aberta") return { label: "Aberta", tone: "info" as const };
  if (value === "aguardando_pagamento") {
    return { label: "Aguardando pagamento", tone: "warning" as const };
  }
  if (value === "fechada") return { label: "Fechada", tone: "success" as const };
  if (value === "cancelada") return { label: "Cancelada", tone: "danger" as const };

  return { label: status || "Status", tone: "neutral" as const };
}

export default async function ComandasPage() {
  const session = await requireProfissionalAppContext();
  let comandas = [];

  try {
    comandas = await listarComandasProfissional(
      session.idSalao,
      session.idProfissional
    );
  } catch {
    return (
      <ProfissionalShell title="Comandas" subtitle="Abertas e atendimentos">
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          Nao foi possivel carregar as comandas agora.
        </div>
      </ProfissionalShell>
    );
  }

  const abertas = comandas.filter(
    (comanda) => String(comanda.status).toLowerCase() === "aberta"
  );
  const totalAberto = abertas.reduce((acc, item) => acc + Number(item.total || 0), 0);

  return (
    <ProfissionalShell title="Comandas" subtitle="Abertas e atendimentos">
      <div className="space-y-3.5">
        <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                <Receipt size={14} />
                Controle rapido
              </div>

              <h2 className="mt-3 text-[1.45rem] font-black tracking-[-0.04em] leading-none">
                {abertas.length} abertas
              </h2>

              <p className="mt-2.5 text-sm leading-6 text-zinc-300">
                Veja o que esta em andamento e entre direto na comanda certa.
              </p>
            </div>

            <div className="min-w-0 rounded-[1.1rem] bg-white/10 px-4 py-2.5 text-right">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                Total em aberto
              </div>
              <div className="mt-1 break-words text-lg font-bold">
                {formatarMoeda(totalAberto)}
              </div>
            </div>
          </div>
        </section>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Atalhos"
            description="Abra uma nova comanda sem sair do app."
          />

          <Link
            href="/app-profissional/comandas/nova"
            className="flex h-11 w-full items-center justify-center rounded-[18px] bg-zinc-950 text-sm font-bold text-white shadow-sm"
          >
            Nova comanda
          </Link>
        </ProfissionalSurface>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Lista de comandas"
            description="Toque em uma comanda para adicionar itens, revisar ou enviar ao caixa."
          />

          {comandas.length ? (
            <div className="space-y-2.5">
              {comandas.map((comanda) => {
                const status = getStatusMeta(comanda.status);

                return (
                  <Link
                    key={comanda.id}
                    href={`/app-profissional/comandas/${comanda.id}`}
                    className="block rounded-[1.25rem] border border-zinc-200 bg-zinc-50/70 p-3.5 transition active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
                          Comanda #{comanda.numero}
                        </div>
                        <div className="mt-1.5 truncate text-base font-bold tracking-[-0.02em] text-zinc-950">
                          {comanda.cliente_nome}
                        </div>
                      </div>

                      <ArrowRight size={18} className="shrink-0 text-zinc-400" />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 break-words text-lg font-black tracking-[-0.04em] text-zinc-950">
                        {formatarMoeda(comanda.total)}
                      </div>
                      <ProfissionalStatusPill
                        label={status.label}
                        tone={status.tone}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <ProfissionalEmptyState
              title="Nenhuma comanda encontrada"
              description="Quando houver atendimento com comanda vinculada, ele aparecera aqui."
              action={
                <Link
                  href="/app-profissional/comandas/nova"
                  className="inline-flex h-10 items-center justify-center rounded-[18px] bg-zinc-950 px-4 text-sm font-bold text-white"
                >
                  Criar comanda
                </Link>
              }
            />
          )}
        </ProfissionalSurface>
      </div>
    </ProfissionalShell>
  );
}
