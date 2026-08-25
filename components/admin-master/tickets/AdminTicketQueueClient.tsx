"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ChevronDown, Clock3, ExternalLink, UserCheck } from "lucide-react";
import type { TicketSummary } from "@/lib/support/tickets";

type AdminOption = { id: string; nome: string; email: string };

type Props = {
  items: TicketSummary[];
  admins: AdminOption[];
  currentAdminId: string;
  canEdit: boolean;
};

function badge(value: string, kind: "status" | "priority") {
  const normalized = value.toLowerCase();
  if (["resolvido", "fechado"].includes(normalized)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["critica", "crítica"].includes(normalized)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (normalized === "alta") return "border-orange-200 bg-orange-50 text-orange-700";
  if (["aguardando_tecnico", "media", "média"].includes(normalized)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "aguardando_cliente") return "border-blue-200 bg-blue-50 text-blue-700";
  if (kind === "priority" && normalized === "baixa") return "border-zinc-200 bg-zinc-50 text-zinc-600";
  return "border-violet-200 bg-violet-50 text-violet-700";
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function slaInfo(item: TicketSummary) {
  if (["resolvido", "fechado"].includes(String(item.status))) {
    return { label: "Encerrado", className: "text-emerald-700" };
  }
  if (!item.slaLimiteEm) return { label: "Sem SLA", className: "text-zinc-400" };
  const diff = new Date(item.slaLimiteEm).getTime() - Date.now();
  if (!Number.isFinite(diff)) return { label: "Sem SLA", className: "text-zinc-400" };
  if (diff < 0) {
    const hours = Math.max(1, Math.ceil(Math.abs(diff) / 3_600_000));
    return { label: `Vencido há ${hours}h`, className: "font-black text-rose-700" };
  }
  const hours = Math.max(1, Math.ceil(diff / 3_600_000));
  return {
    label: hours <= 4 ? `Vence em ${hours}h` : `SLA ${hours}h`,
    className: hours <= 4 ? "font-black text-amber-700" : "text-zinc-500",
  };
}

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Não foi possível atualizar o ticket.");
  return payload;
}

export default function AdminTicketQueueClient({ items, admins, currentAdminId, canEdit }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function updateTicket(item: TicketSummary, body: Record<string, unknown>, message: string) {
    if (!canEdit || saving) return;
    setSaving(item.id);
    setError("");
    setFeedback("");
    try {
      await readJson(
        await fetch(`/api/admin-master/tickets/${item.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: item.status,
            prioridade: item.prioridade,
            assumir: false,
            ...body,
          }),
        })
      );
      setFeedback(message);
      router.refresh();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao atualizar ticket.");
    } finally {
      setSaving(null);
    }
  }

  function Assignment({ item }: { item: TicketSummary }) {
    return (
      <select
        value={item.responsavelAdminId || ""}
        disabled={!canEdit || saving === item.id}
        onChange={(event) => {
          const value = event.target.value;
          void updateTicket(
            item,
            { responsavelAdminId: value || null, motivo: value ? "Responsável do atendimento alterado." : "Ticket removido da fila pessoal." },
            value ? "Responsável atualizado." : "Ticket ficou sem responsável."
          );
        }}
        className="h-9 max-w-[180px] rounded-lg border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-700 outline-none focus:border-violet-300 disabled:opacity-60"
        aria-label={`Responsável do ticket ${item.numero}`}
      >
        <option value="">Sem responsável</option>
        {admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.nome}</option>)}
      </select>
    );
  }

  function Actions({ item }: { item: TicketSummary }) {
    const isMine = item.responsavelAdminId === currentAdminId;
    return (
      <details className="relative">
        <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50">
          Ações <ChevronDown size={13} />
        </summary>
        <div className="absolute right-0 z-30 mt-1.5 w-48 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl">
          <Link href={`/admin-master/tickets/${item.id}`} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"><ExternalLink size={14} /> Abrir ticket</Link>
          {!isMine && canEdit ? <button type="button" onClick={() => void updateTicket(item, { status: "em_atendimento", responsavelAdminId: currentAdminId, motivo: "Ticket assumido pela fila de atendimento." }, "Ticket assumido.")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-violet-700 hover:bg-violet-50"><UserCheck size={14} /> Assumir</button> : null}
          {!['resolvido','fechado'].includes(String(item.status)) && canEdit ? <button type="button" onClick={() => void updateTicket(item, { status: "resolvido", motivo: "Ticket resolvido pela ação rápida da fila." }, "Ticket marcado como resolvido.")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50"><CheckCircle2 size={14} /> Resolver</button> : null}
        </div>
      </details>
    );
  }

  return (
    <div className="space-y-3">
      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <div className="space-y-3 md:hidden">
        {items.map((item) => {
          const sla = slaInfo(item);
          return (
            <article key={item.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${sla.label.startsWith("Vencido") ? "border-rose-200" : "border-zinc-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-violet-700">#{item.numero}</div>
                  <Link href={`/admin-master/tickets/${item.id}`} className="mt-1 block break-words text-sm font-black text-zinc-950">{item.assunto}</Link>
                  <div className="mt-1 text-xs text-zinc-500">{item.salaoNome || item.salaoId || "Salão não identificado"}</div>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge(String(item.prioridade), "priority")}`}>{label(String(item.prioridade))}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge(String(item.status), "status")}`}>{label(String(item.status))}</span>{item.recoveryFlow ? <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">Recuperação MFA</span> : null}</div>
              <div className="mt-3 flex items-center gap-1.5 text-xs"><Clock3 size={13} className="text-zinc-400" /><span className={sla.className}>{sla.label}</span></div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3"><Assignment item={item} /><Actions item={item} /></div>
            </article>
          );
        })}
        {!items.length ? <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">Nenhum ticket encontrado com os filtros atuais.</div> : null}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-semibold text-zinc-500">
            <tr>{["Ticket", "Salão", "Prioridade", "Status", "SLA", "Responsável", "Atualizado", "Ações"].map((column) => <th key={column} className="whitespace-nowrap px-4 py-3">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((item) => {
              const sla = slaInfo(item);
              return (
                <tr key={item.id} className={sla.label.startsWith("Vencido") ? "bg-rose-50/35 hover:bg-rose-50/60" : "hover:bg-zinc-50/70"}>
                  <td className="max-w-[320px] px-4 py-3"><Link href={`/admin-master/tickets/${item.id}`} className="font-black text-zinc-950 hover:text-violet-700">#{item.numero} · {item.assunto}</Link><div className="mt-1 truncate text-xs text-zinc-500">{item.solicitanteNome}{item.recoveryFlow ? " · Recuperação MFA" : ""}</div></td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-zinc-700">{item.salaoNome || item.salaoId || "-"}</td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badge(String(item.prioridade), "priority")}`}>{label(String(item.prioridade))}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badge(String(item.status), "status")}`}>{label(String(item.status))}</span></td>
                  <td className={`whitespace-nowrap px-4 py-3 text-xs ${sla.className}`}>{sla.label}</td>
                  <td className="px-4 py-3"><Assignment item={item} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">{item.ultimaInteracaoLabel}</td>
                  <td className="px-4 py-3"><Actions item={item} /></td>
                </tr>
              );
            })}
            {!items.length ? <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">Nenhum ticket encontrado com os filtros atuais.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
