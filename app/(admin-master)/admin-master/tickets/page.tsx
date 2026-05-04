import Link from "next/link";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { listAdminTickets } from "@/lib/support/tickets";

export const dynamic = "force-dynamic";

function kpiToneClass(tone: "default" | "amber" | "blue" | "red") {
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-950";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-950";
  if (tone === "red") return "border-rose-200 bg-rose-50 text-rose-950";
  return "border-zinc-200 bg-white text-zinc-950";
}

function formatRecoveryStage(item: {
  recoveryFlow?: boolean;
  recoveryStatus?: string | null;
  recoveryReadyToComplete?: boolean;
  recoveryReviewStatus?: string | null;
}) {
  if (!item.recoveryFlow) return null;
  if (item.recoveryReadyToComplete) {
    return {
      label: "Pronto para concluir",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (item.recoveryStatus === "cooldown") {
    return {
      label: "Em carencia",
      className: "border-violet-200 bg-violet-50 text-violet-700",
    };
  }
  if (item.recoveryReviewStatus === "illegible") {
    return {
      label: "Reenviar imagem",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (item.recoveryReviewStatus === "divergent") {
    return {
      label: "Corrigir divergencia",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  return {
    label: "Aguardando revisao",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  };
}

export default async function AdminMasterTicketsPage() {
  await requireAdminMasterUser("tickets_ver");
  const { items, metrics } = await listAdminTickets();

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <div className="text-xs font-bold uppercase tracking-[0.35em] text-amber-200">
          AdminMaster
        </div>
        <h2 className="mt-3 font-display text-4xl font-black">Tickets e suporte</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
          Painel operacional para acompanhar chamados do salao, SLA, prioridade,
          ultima resposta e dono do atendimento.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tickets", value: metrics.total, hint: "Historico recente", tone: "default" as const },
          { label: "Em andamento", value: metrics.abertos, hint: "Ainda nao encerrados", tone: "amber" as const },
          { label: "Aguardando cliente", value: metrics.aguardandoCliente, hint: "Pedir retorno do salao", tone: "blue" as const },
          { label: "Criticos", value: metrics.criticos, hint: "Prioridade alta", tone: "red" as const },
        ].map((item) => (
          <div key={item.label} className={`rounded-[28px] border p-5 shadow-sm ${kpiToneClass(item.tone)}`}>
            <div className="text-xs font-bold uppercase tracking-[0.24em] opacity-60">
              {item.label}
            </div>
            <div className="mt-3 font-display text-3xl font-black">{item.value}</div>
            <div className="mt-2 text-sm opacity-70">{item.hint}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Recuperacoes pendentes",
            value: metrics.recoveryPending,
            hint: "Pedidos aguardando revisao ou reenvio",
            tone: "blue" as const,
          },
          {
            label: "Em carencia",
            value: metrics.recoveryCooldown,
            hint: "Aprovadas e aguardando o prazo",
            tone: "amber" as const,
          },
          {
            label: "Prontas para concluir",
            value: metrics.recoveryReadyToComplete,
            hint: "Ja podem remover o autenticador",
            tone: "red" as const,
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-[24px] border p-4 shadow-sm ${kpiToneClass(item.tone)}`}
          >
            <div className="text-xs font-bold uppercase tracking-[0.22em] opacity-60">
              {item.label}
            </div>
            <div className="mt-2 font-display text-2xl font-black">{item.value}</div>
            <div className="mt-1 text-sm opacity-70">{item.hint}</div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-sm">
        <div className="scroll-premium overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-100 text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                {["ticket", "salao", "solicitante", "prioridade", "status", "recuperacao", "atualizado", "detalhe"].map((column) => (
                  <th key={column} className="px-5 py-4 font-bold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.length ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/80">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-zinc-950">#{item.numero}</div>
                      <div className="text-zinc-500">{item.assunto}</div>
                    </td>
                    <td className="px-5 py-4">{item.salaoNome || item.salaoId || "-"}</td>
                    <td className="px-5 py-4">{item.solicitanteNome}</td>
                    <td className="px-5 py-4">{item.prioridade}</td>
                    <td className="px-5 py-4">{item.status}</td>
                    <td className="px-5 py-4">
                      {formatRecoveryStage(item) ? (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${formatRecoveryStage(item)?.className}`}
                        >
                          {formatRecoveryStage(item)?.label}
                        </span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">{item.ultimaInteracaoLabel}</td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin-master/tickets/${item.id}`}
                        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-800 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-zinc-500">
                    Nenhum ticket encontrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
