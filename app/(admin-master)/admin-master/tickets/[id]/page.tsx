import Link from "next/link";
import { AdminDataTable, AdminKpiGrid } from "@/components/admin-master/AdminMasterViews";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminMasterTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const [{ data: ticket }, { data: mensagens }, { data: eventos }] =
    await Promise.all([
      supabase.from("tickets").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("ticket_mensagens")
        .select("autor_tipo, mensagem, interna, criada_em")
        .eq("id_ticket", id)
        .order("criada_em", { ascending: true }),
      supabase
        .from("ticket_eventos")
        .select("evento, descricao, criado_em")
        .eq("id_ticket", id)
        .order("criado_em", { ascending: false }),
    ]);

  const row = (ticket || {}) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <Link href="/admin-master/tickets" className="text-sm font-bold text-amber-200">
          Voltar para tickets
        </Link>
        <h2 className="mt-4 font-display text-4xl font-black">
          Ticket #{String(row.numero || "-")}
        </h2>
        <p className="mt-2 text-sm text-zinc-300">
          {String(row.assunto || "Sem assunto")}
        </p>
      </section>

      <AdminKpiGrid
        kpis={[
          {
            label: "Status",
            value: String(row.status || "-"),
            hint: "Fluxo do atendimento",
            tone: "blue",
          },
          {
            label: "Prioridade",
            value: String(row.prioridade || "-"),
            hint: "SLA e urgencia",
            tone: String(row.prioridade || "").toLowerCase() === "critica" ? "red" : "amber",
          },
          {
            label: "Categoria",
            value: String(row.categoria || "-"),
            hint: "Modulo do problema",
            tone: "dark",
          },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-display text-2xl font-black">Thread</h3>
          <AdminDataTable
            rows={(mensagens || []) as Record<string, string | number | boolean | null>[]}
            columns={["autor_tipo", "mensagem", "interna", "criada_em"]}
          />
        </div>
        <div className="space-y-3">
          <h3 className="font-display text-2xl font-black">Eventos</h3>
          <AdminDataTable
            rows={(eventos || []) as Record<string, string | number | boolean | null>[]}
            columns={["evento", "descricao", "criado_em"]}
          />
        </div>
      </section>
    </div>
  );
}
