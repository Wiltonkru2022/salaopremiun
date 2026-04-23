import Link from "next/link";
import { notFound } from "next/navigation";
import AdminMasterWebhookReprocessButton from "@/components/admin-master/AdminMasterWebhookReprocessButton";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import {
  buildWebhookMirrorKey,
  formatWebhookDate,
} from "@/lib/admin-master/webhooks-sync";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

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

  const mirrorKey = buildWebhookMirrorKey(sourceId);

  const { webhook, espelho } = await runAdminOperation({
    action: "admin_master_webhook_detail",
    run: async (supabase) => {
      const [{ data: webhookData }, { data: espelhoData }] = await Promise.all([
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

      return {
        webhook: webhookData,
        espelho: espelhoData,
      };
    },
  });

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
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.35em] text-amber-200">
              AdminMaster
            </div>
            <h1 className="mt-3 font-display text-4xl font-black">
              Payload do webhook
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              Evento bruto do Asaas, espelho operacional no AdminMaster e replay
              manual com auditoria.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin-master/webhooks"
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
            >
              Voltar para webhooks
            </Link>
          </div>
        </div>
      </section>

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
              Diagnostico rapido
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
                <span className="font-semibold text-zinc-900">Ultimo recebido:</span>{" "}
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
