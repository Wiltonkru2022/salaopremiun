import Link from "next/link";
import { notFound } from "next/navigation";
import AdminMasterPageHeader from "@/components/admin-master/AdminMasterPageHeader";
import AdminMasterWebhookReprocessButton from "@/components/admin-master/AdminMasterWebhookReprocessButton";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import {
  buildWebhookMirrorKey,
  formatWebhookDate,
} from "@/lib/admin-master/webhooks-sync";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function prettyJson(value: unknown) {
  return JSON.stringify(value || {}, null, 2);
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-xl font-black text-zinc-950">{value}</div>
      {hint ? <div className="mt-2 text-sm text-zinc-500">{hint}</div> : null}
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function AdminMasterWebhookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminMasterUser("operacao_ver");
  const { id } = await params;
  const sourceId = String(id || "").trim();

  if (!sourceId) {
    notFound();
  }

  const supabase = getSupabaseAdmin();
  const mirrorKey = buildWebhookMirrorKey(sourceId);

  const [{ data: webhook }, { data: espelho }] = await Promise.all([
    supabase
      .from("asaas_webhook_eventos")
      .select(
        "id, evento, payment_id, payment_status, status_processamento, tentativas, erro_mensagem, payload, primeiro_recebido_em, ultimo_recebido_em, processado_em, id_salao, id_assinatura, id_cobranca, event_order, decisao"
      )
      .eq("id", sourceId)
      .maybeSingle(),
    supabase
      .from("eventos_webhook")
      .select(
        "id, status, payload_json, resposta_json, erro_texto, tentativas, recebido_em, processado_em"
      )
      .eq("chave", mirrorKey)
      .maybeSingle(),
  ]);

  if (!webhook?.id) {
    notFound();
  }

  const payload =
    webhook.payload && typeof webhook.payload === "object" ? webhook.payload : {};
  const resposta =
    espelho?.resposta_json && typeof espelho.resposta_json === "object"
      ? espelho.resposta_json
      : {};

  return (
    <div className="space-y-6">
      <AdminMasterPageHeader
        eyebrow="Diagnóstico técnico"
        title="Payload do webhook"
        description="Evento bruto do Asaas, espelho operacional no Admin Master e replay manual com auditoria."
        breadcrumb={[{ label: "Admin Master", href: "/admin-master" }, { label: "Webhooks", href: "/admin-master/webhooks" }, { label: "Detalhe" }]}
        actions={<Link href="/admin-master/webhooks" className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:border-violet-200 hover:text-violet-700">Voltar para webhooks</Link>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Evento"
          value={String(webhook.evento || "-")}
          hint={`Payment ${String(webhook.payment_id || "-")}`}
        />
        <SummaryCard
          label="Status origem"
          value={String(webhook.status_processamento || "-")}
          hint={`Tentativas ${Number(webhook.tentativas || 0)}`}
        />
        <SummaryCard
          label="Status espelho"
          value={String(espelho?.status || "-")}
          hint={`Recebido ${formatWebhookDate(espelho?.recebido_em || webhook.ultimo_recebido_em)}`}
        />
        <SummaryCard
          label="Decisao"
          value={String(webhook.decisao || "-")}
          hint={`Order ${Number(webhook.event_order || 0)}`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
              Payload bruto
            </div>
            <pre className="scroll-premium mt-4 overflow-x-auto rounded-[24px] bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">
              {prettyJson(payload)}
            </pre>
          </div>

          <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
              Resposta espelhada
            </div>
            <pre className="scroll-premium mt-4 overflow-x-auto rounded-[24px] bg-zinc-900 p-4 text-xs leading-6 text-zinc-100">
              {prettyJson(resposta)}
            </pre>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
              Replay manual
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              O replay marca o evento original para novo processamento, chama o
              endpoint interno do webhook e grava auditoria no AdminMaster.
            </p>
            <div className="mt-5">
              <AdminMasterWebhookReprocessButton webhookId={sourceId} />
            </div>
          </div>

          <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
              Diagnostico rápido
            </div>
            <div className="mt-4 space-y-3 text-sm text-zinc-600">
              <div>
                <span className="font-semibold text-zinc-900">Erro origem:</span>{" "}
                {String(webhook.erro_mensagem || "-")}
              </div>
              <div>
                <span className="font-semibold text-zinc-900">Erro espelho:</span>{" "}
                {String(espelho?.erro_texto || "-")}
              </div>
              <div>
                <span className="font-semibold text-zinc-900">Primeiro recebido:</span>{" "}
                {formatWebhookDate(webhook.primeiro_recebido_em)}
              </div>
              <div>
                <span className="font-semibold text-zinc-900">Último recebido:</span>{" "}
                {formatWebhookDate(webhook.ultimo_recebido_em)}
              </div>
              <div>
                <span className="font-semibold text-zinc-900">Processado em:</span>{" "}
                {formatWebhookDate(webhook.processado_em)}
              </div>
              <div>
                <span className="font-semibold text-zinc-900">Assinatura:</span>{" "}
                {String(webhook.id_assinatura || "-")}
              </div>
              <div>
                <span className="font-semibold text-zinc-900">Cobranca:</span>{" "}
                {String(webhook.id_cobranca || "-")}
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
