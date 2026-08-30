import Link from "next/link";
import { Pool } from "@neondatabase/serverless";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, WalletCards } from "lucide-react";
import AdminMasterPageHeader from "@/components/admin-master/AdminMasterPageHeader";
import {
  consultarRecargaWhatsappAsaasAdminMaster,
  reprocessarRecargaWhatsappAdminMaster,
} from "@/app/(admin-master)/admin-master/whatsapp/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { resolveNeonRuntimeUrl } from "@/lib/neon/runtime-url.server";

export const dynamic = "force-dynamic";

type RecargaRow = {
  id: string;
  id_salao: string | null;
  status: string | null;
  valor_centavos: number | string | null;
  billing_type: string | null;
  asaas_payment_id: string | null;
  criado_em: string | null;
  expira_em: string | null;
  pago_em: string | null;
  creditado_em: string | null;
  erro_texto: string | null;
  atualizado_em: string | null;
};

type SalaoRow = {
  id: string;
  nome: string | null;
  responsavel: string | null;
};

let pool: Pool | null = null;
let poolUrl = "";

function getPool() {
  const url = resolveNeonRuntimeUrl(
    process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL,
  );
  if (!url) {
    throw new Error("Neon nao configurado para carregar recargas WhatsApp.");
  }
  if (!pool || poolUrl !== url) {
    pool = new Pool({ connectionString: url });
    poolUrl = url;
  }
  return pool;
}

async function loadRecargasWhatsapp() {
  const client = await getPool().connect();
  try {
    await client.query(
      `update public.whatsapp_creditos_recargas
          set status = 'expirado', atualizado_em = now()
        where status = 'pendente'
          and expira_em is not null
          and expira_em <= now()`,
    );

    const recargasResult = await client.query<RecargaRow>(
      `select
         id::text as id,
         id_salao::text as id_salao,
         status::text as status,
         valor_centavos,
         billing_type::text as billing_type,
         asaas_payment_id::text as asaas_payment_id,
         criado_em::text as criado_em,
         expira_em::text as expira_em,
         pago_em::text as pago_em,
         creditado_em::text as creditado_em,
         erro_texto::text as erro_texto,
         atualizado_em::text as atualizado_em
       from public.whatsapp_creditos_recargas
       order by criado_em desc nulls last
       limit 100`,
    );

    const rows = recargasResult.rows || [];
    const salaoIds = [...new Set(rows.map((row) => String(row.id_salao || "")).filter(Boolean))];

    let saloes: SalaoRow[] = [];
    if (salaoIds.length) {
      const saloesResult = await client.query<SalaoRow>(
        `select id::text as id, nome::text as nome, responsavel::text as responsavel
           from public.saloes
          where id::text = any($1::text[])`,
        [salaoIds],
      );
      saloes = saloesResult.rows || [];
    }

    return { rows, saloes };
  } finally {
    client.release();
  }
}

function money(value: unknown) {
  return (Number(value || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function statusStyle(status: string) {
  if (status === "pago") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "falhou") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "processando") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "pendente") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

export default async function AdminMasterWhatsappRecargasPage() {
  await requireAdminMasterUser("whatsapp_ver");
  const { rows, saloes } = await loadRecargasWhatsapp();

  const salaoMap = new Map<string, string>(
    saloes.map((salao) => [
      String(salao.id),
      String(salao.nome || salao.responsavel || "Salao"),
    ]),
  );

  const falhasPagas = rows.filter(
    (row) => String(row.status || "") === "falhou" && Boolean(row.pago_em),
  );
  const pendentes = rows.filter((row) => String(row.status || "") === "pendente");
  const pagos = rows.filter((row) => String(row.status || "") === "pago");

  return (
    <div className="space-y-6">
      <AdminMasterPageHeader
        eyebrow="WhatsApp"
        title="Recargas e conciliação PIX"
        description="Acompanhe quem pagou, quem ainda está aguardando e recupere com segurança um crédito que não entrou automaticamente."
        breadcrumb={[{ label: "Admin Master", href: "/admin-master" }, { label: "WhatsApp", href: "/admin-master/whatsapp" }, { label: "Recargas" }]}
        actions={<Link href="/admin-master/whatsapp" className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:border-violet-200 hover:text-violet-700">Voltar ao WhatsApp</Link>}
      />

      {falhasPagas.length ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5" size={20} />
            <div>
              <div className="font-black">Pagamento confirmado sem credito</div>
              <p className="mt-1 text-sm leading-6">
                Existem {falhasPagas.length} recarga(s) que registraram pagamento, mas falharam ao liberar saldo. Revise e use “Reprocessar credito”.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <Clock3 size={18} className="text-amber-600" />
          <div className="mt-3 text-2xl font-black text-zinc-950">{pendentes.length}</div>
          <div className="text-xs font-bold text-zinc-500">Aguardando pagamento</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <div className="mt-3 text-2xl font-black text-zinc-950">{pagos.length}</div>
          <div className="text-xs font-bold text-zinc-500">Pagas e creditadas</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <AlertTriangle size={18} className="text-rose-600" />
          <div className="mt-3 text-2xl font-black text-zinc-950">{falhasPagas.length}</div>
          <div className="text-xs font-bold text-zinc-500">Exigem atencao</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-2 font-black text-zinc-950">
            <WalletCards size={18} /> Ultimas recargas
          </div>
          <p className="mt-1 text-xs text-zinc-500">PIX do SalaoPremium expira 24 horas apos ser gerado. Sao exibidas as 100 recargas mais recentes.</p>
        </div>
        <div className="grid gap-3 p-4 md:hidden">
          {rows.map((row) => {
            const id = String(row.id);
            const status = String(row.status || "pendente");
            const idSalao = String(row.id_salao || "");
            return (
              <article key={id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-zinc-950">{salaoMap.get(idSalao) || "Salão"}</div>
                    <div className="mt-1 text-lg font-black text-zinc-950">{money(row.valor_centavos)}</div>
                  </div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusStyle(status)}`}>{status}</span>
                </div>
                <div className="mt-3 grid gap-1 text-xs leading-5 text-zinc-500">
                  <span>Gerado: {dateTime(row.criado_em)}</span>
                  <span>Expira: {dateTime(row.expira_em)}</span>
                  <span>Pago: {dateTime(row.pago_em)}</span>
                  <span>Creditado: {dateTime(row.creditado_em)}</span>
                </div>
                {row.erro_texto ? <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">Falha registrada para suporte.</div> : null}
                <details className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-black text-zinc-700">Ações</summary>
                  <div className="grid gap-2 border-t border-zinc-200 p-3">
                    <form action={consultarRecargaWhatsappAsaasAdminMaster}>
                      <input type="hidden" name="id" value={id} />
                      <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-800"><RefreshCw size={14} />Consultar no Asaas</button>
                    </form>
                    {status === "falhou" && row.pago_em ? (
                      <form action={reprocessarRecargaWhatsappAdminMaster}>
                        <input type="hidden" name="id" value={id} />
                        <button className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-violet-600 px-3 text-xs font-black text-white hover:bg-violet-700">Reprocessar crédito</button>
                      </form>
                    ) : null}
                  </div>
                </details>
              </article>
            );
          })}
          {!rows.length ? <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">Nenhuma recarga registrada.</div> : null}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">Salao</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Gerado / expira</th>
                <th className="px-4 py-3">Pagamento / credito</th>
                <th className="px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => {
                const id = String(row.id);
                const status = String(row.status || "pendente");
                const idSalao = String(row.id_salao || "");
                return (
                  <tr key={id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-black text-zinc-950">{salaoMap.get(idSalao) || "Salao"}</div>
                      <div className="mt-1 text-[11px] text-zinc-400">{idSalao.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-4 font-black text-zinc-950">{money(row.valor_centavos)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusStyle(status)}`}>
                        {status}
                      </span>
                      {row.erro_texto ? <div className="mt-2 max-w-[260px] text-xs leading-5 text-rose-600">Falha registrada para suporte.</div> : null}
                    </td>
                    <td className="px-4 py-4 text-xs leading-6 text-zinc-600">
                      <div>{dateTime(row.criado_em)}</div>
                      <div className="font-bold">Expira: {dateTime(row.expira_em)}</div>
                    </td>
                    <td className="px-4 py-4 text-xs leading-6 text-zinc-600">
                      <div>Pago: {dateTime(row.pago_em)}</div>
                      <div>Creditado: {dateTime(row.creditado_em)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-[190px] flex-col gap-2">
                        <form action={consultarRecargaWhatsappAsaasAdminMaster}>
                          <input type="hidden" name="id" value={id} />
                          <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-800 hover:bg-zinc-50">
                            <RefreshCw size={14} /> Consultar no Asaas
                          </button>
                        </form>
                        {status === "falhou" && row.pago_em ? (
                          <form action={reprocessarRecargaWhatsappAdminMaster}>
                            <input type="hidden" name="id" value={id} />
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-black text-white hover:bg-zinc-800">
                              Reprocessar credito
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr><td colSpan={6} className="px-5 py-8 text-sm text-zinc-500">Nenhuma recarga registrada.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
