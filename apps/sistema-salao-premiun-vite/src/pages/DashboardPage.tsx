import { useEffect, useMemo, useState } from "react";
import { CalendarDays, HandCoins, Scissors, Users, Wallet } from "lucide-react";
import { Card, EmptyState, StatusPill } from "../components/ui";
import { money, time } from "../lib/format";
import { database } from "../lib/database";
import type { AppSession, AnyRow } from "../types";

export function DashboardPage({ session }: { session: AppSession }) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [agendamentos, setAgendamentos] = useState<AnyRow[]>([]);
  const [clientes, setClientes] = useState<AnyRow[]>([]);
  const [servicos, setServicos] = useState<AnyRow[]>([]);
  const [comandas, setComandas] = useState<AnyRow[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErro("");
      try {
        const idSalao = session.usuario.id_salao;
        const today = new Date().toISOString().slice(0, 10);
        const [agendaRes, clientesRes, servicosRes, comandasRes] = await Promise.all([
          database.from("agendamentos").select("id, data, hora_inicio, status, clientes(nome), servicos(nome), profissionais(nome)").eq("id_salao", idSalao).gte("data", today).order("data").order("hora_inicio").limit(8),
          database.from("clientes").select("id").eq("id_salao", idSalao).limit(5000),
          database.from("servicos").select("id").eq("id_salao", idSalao).limit(5000),
          database.from("comandas").select("id, total, status").eq("id_salao", idSalao).limit(5000),
        ]);
        for (const result of [agendaRes, clientesRes, servicosRes, comandasRes]) if (result.error) throw result.error;
        if (!alive) return;
        setAgendamentos((agendaRes.data || []) as AnyRow[]);
        setClientes((clientesRes.data || []) as AnyRow[]);
        setServicos((servicosRes.data || []) as AnyRow[]);
        setComandas((comandasRes.data || []) as AnyRow[]);
      } catch (error) {
        if (alive) setErro(error instanceof Error ? error.message : "Erro ao carregar dashboard.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [session.usuario.id_salao]);

  const faturamento = useMemo(() => comandas.filter((item) => String(item.status || "").includes("fech")).reduce((acc, item) => acc + Number(item.total || 0), 0), [comandas]);
  const abertas = comandas.filter((item) => String(item.status || "") === "aberta").length;

  return <div className="space-y-4">
    <section className="rounded-[1.7rem] bg-zinc-950 p-5 text-white shadow-soft"><div className="max-w-3xl"><div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-amber-100">Comando do salão</div><h2 className="mt-3 text-4xl font-black tracking-[-0.06em]">Dashboard Vite</h2><p className="mt-2 text-sm font-semibold leading-6 text-zinc-300">Visão rápida da agenda, caixa, clientes e serviços sem loading pesado.</p></div></section>
    {erro ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{erro}</div> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Kpi title="Agenda" value={String(agendamentos.length)} helper="próximos horários" icon={<CalendarDays size={20} />} loading={loading} /><Kpi title="Clientes" value={String(clientes.length)} helper="cadastrados" icon={<Users size={20} />} loading={loading} /><Kpi title="Serviços" value={String(servicos.length)} helper="no catálogo" icon={<Scissors size={20} />} loading={loading} /><Kpi title="Comandas" value={String(abertas)} helper="abertas" icon={<Wallet size={20} />} loading={loading} /><Kpi title="Faturamento" value={money(faturamento)} helper="comandas fechadas" icon={<HandCoins size={20} />} loading={loading} /></div>
    <Card><h3 className="text-xl font-black tracking-[-0.04em]">Próximos agendamentos</h3><p className="text-sm font-bold text-zinc-500">Lista curta para recepção agir rápido.</p><div className="mt-4 grid gap-2">{agendamentos.length ? agendamentos.map((item) => <div key={String(item.id)} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3"><div className="min-w-0"><div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{item.data as string} às {time(item.hora_inicio as string)}</div><div className="truncate text-sm font-black text-zinc-950">{relationName(item.clientes) || "Cliente"}</div><div className="truncate text-xs font-bold text-zinc-500">{relationName(item.servicos) || "Serviço"} · {relationName(item.profissionais) || "Profissional"}</div></div><StatusPill status={String(item.status || "pendente")} /></div>) : <EmptyState title="Agenda limpa" message="Nenhum próximo agendamento encontrado." />}</div></Card>
  </div>;
}

function Kpi({ title, value, helper, icon, loading }: { title: string; value: string; helper: string; icon: React.ReactNode; loading: boolean }) {
  return <Card><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{title}</div><strong className="mt-2 block truncate text-2xl font-black tracking-[-0.05em] text-zinc-950">{loading ? "..." : value}</strong><div className="mt-1 text-xs font-bold text-zinc-500">{helper}</div></div><div className="rounded-2xl bg-zinc-100 p-3 text-zinc-800">{icon}</div></div></Card>;
}

function relationName(value: unknown) {
  if (Array.isArray(value)) return String((value[0] as AnyRow | undefined)?.nome || "");
  return String((value as AnyRow | null)?.nome || "");
}
