import { CalendarClock, CheckCircle2, CircleDollarSign, Sparkles, Users } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { money } from "../lib/date";
import type { Agendamento, Cliente, Comanda, Servico } from "../types/database";

export function InicioPage({
  nome,
  agendamentos,
  clientes,
  servicos,
  comandas,
  goTo
}: {
  nome: string;
  agendamentos: Agendamento[];
  clientes: Cliente[];
  servicos: Servico[];
  comandas: Comanda[];
  goTo: (view: "agenda" | "clientes" | "servicos" | "comandas") => void;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const hojeItens = agendamentos.filter((item) => item.data === hoje);
  const confirmados = hojeItens.filter((item) => item.status === "confirmado").length;
  const previsto = hojeItens.reduce((acc, item) => acc + Number(item.servicos?.preco || 0), 0);
  const proximo = hojeItens.find((item) => item.status !== "cancelado");

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.6rem] bg-zinc-950 p-5 text-white shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-amber-200">
              <Sparkles size={15} />
              Acesso ativo
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.06em]">{nome}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-zinc-300">
              Seu dia resumido para abrir agenda, atender cliente e fechar comanda sem rodeio.
            </p>
          </div>
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-400 text-zinc-950">
            <CalendarClock size={26} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <MiniMetric label="Hoje" value={hojeItens.length} />
          <MiniMetric label="Ok" value={confirmados} />
          <MiniMetric label="Previsto" value={money(previsto)} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <ActionCard icon={<CalendarClock size={22} />} title="Agenda" text="Ver horarios" onClick={() => goTo("agenda")} />
        <ActionCard icon={<Users size={22} />} title="Clientes" text={`${clientes.length} cadastros`} onClick={() => goTo("clientes")} />
        <ActionCard icon={<CheckCircle2 size={22} />} title="Servicos" text={`${servicos.length} ativos`} onClick={() => goTo("servicos")} />
        <ActionCard icon={<CircleDollarSign size={22} />} title="Comandas" text={`${comandas.filter((item) => item.status === "aberta").length} abertas`} onClick={() => goTo("comandas")} />
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black tracking-[-0.04em]">Proximo atendimento</h3>
            <p className="text-sm font-bold text-zinc-500">Toque na agenda para ver detalhes.</p>
          </div>
          <Button className="h-10 px-3" variant="secondary" onClick={() => goTo("agenda")}>
            Abrir
          </Button>
        </div>

        {proximo ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
              {proximo.hora_inicio} - {proximo.hora_fim}
            </div>
            <div className="mt-1 text-lg font-black tracking-[-0.03em]">{proximo.clientes?.nome || "Cliente"}</div>
            <div className="text-sm font-bold text-zinc-500">{proximo.servicos?.nome || "Servico"}</div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 p-5 text-center text-sm font-bold text-zinc-500">
            Nenhum proximo horario para hoje.
          </div>
        )}
      </Card>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <div className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="mt-1 truncate text-lg font-black">{value}</div>
    </div>
  );
}

function ActionCard({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-[1.35rem] border border-zinc-200 bg-white p-4 text-left shadow-sm active:bg-zinc-50">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-amber-800">{icon}</div>
      <div className="mt-4 text-lg font-black tracking-[-0.04em]">{title}</div>
      <div className="mt-0.5 text-sm font-bold text-zinc-500">{text}</div>
    </button>
  );
}
