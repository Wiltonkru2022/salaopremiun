import Link from "next/link";
import { ArrowLeft, Building2, Mail, MapPin, Phone, Smartphone, UserRound } from "lucide-react";
import AdminMasterPageHeader, { AdminMasterMetricCard } from "@/components/admin-master/AdminMasterPageHeader";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Campo_Grande" }).format(parsed);
}

export default async function AdminMasterClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminMasterUser("saloes_ver");
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("id, id_salao, nome, cashback, whatsapp, telefone, email, bairro, profissao, status, ativo, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message || "Erro ao carregar cliente.");
  if (!cliente?.id) {
    return (
      <div className="space-y-5">
        <AdminMasterPageHeader title="Cliente não encontrado" description="O registro pode ter sido removido ou o identificador não existe mais." eyebrow="Clientes" />
        <Link href="/admin-master/saloes" className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700"><ArrowLeft size={15} /> Voltar para salões</Link>
      </div>
    );
  }

  const [{ data: salao }, { data: auth }] = await Promise.all([
    cliente.id_salao
      ? supabase.from("saloes").select("id, nome, responsavel, status").eq("id", cliente.id_salao).maybeSingle()
      : Promise.resolve({ data: null }),
    cliente.id_salao
      ? supabase.from("clientes_auth").select("app_conta_id, app_ativo").eq("id_salao", cliente.id_salao).eq("id_cliente", cliente.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const appConectado = Boolean(auth?.app_conta_id && auth?.app_ativo !== false);
  const contato = cliente.whatsapp || cliente.telefone || cliente.email || "Não informado";

  return (
    <div className="space-y-5">
      <AdminMasterPageHeader
        title={cliente.nome || "Cliente"}
        description="Ficha rápida do cliente encontrada pela busca global do Admin Master."
        eyebrow="Cliente"
        breadcrumb={[
          { label: "Admin Master", href: "/admin-master" },
          { label: "Salões", href: "/admin-master/saloes" },
          { label: cliente.nome || "Cliente" },
        ]}
        actions={salao?.id ? <Link href={`/admin-master/saloes/${salao.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white hover:bg-violet-800"><Building2 size={15} /> Abrir salão</Link> : null}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMasterMetricCard label="Status" value={cliente.status || (cliente.ativo === false ? "inativo" : "ativo")} hint="Estado atual do cadastro" tone={cliente.ativo === false ? "amber" : "green"} />
        <AdminMasterMetricCard label="App Cliente" value={appConectado ? "Conectado" : "Pendente"} hint={appConectado ? "Conta digital vinculada" : "Sem vínculo ativo no app"} tone={appConectado ? "green" : "amber"} />
        <AdminMasterMetricCard label="Cashback" value={`R$ ${Number(cliente.cashback || 0).toFixed(2).replace(".", ",")}`} hint="Saldo registrado" tone="violet" />
        <AdminMasterMetricCard label="Cadastro" value={formatDate(cliente.created_at)} hint={salao?.nome ? `Cliente de ${salao.nome}` : "Salão não identificado"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-violet-600"><UserRound size={15} /> Contato</div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-zinc-50 p-3"><Phone size={16} className="mt-0.5 shrink-0 text-zinc-400" /><div className="min-w-0"><div className="text-xs font-bold text-zinc-400">WhatsApp / telefone</div><div className="mt-1 break-words font-bold text-zinc-900">{cliente.whatsapp || cliente.telefone || "Não informado"}</div></div></div>
            <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-zinc-50 p-3"><Mail size={16} className="mt-0.5 shrink-0 text-zinc-400" /><div className="min-w-0"><div className="text-xs font-bold text-zinc-400">E-mail</div><div className="mt-1 break-all font-bold text-zinc-900">{cliente.email || "Não informado"}</div></div></div>
            <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-zinc-50 p-3"><MapPin size={16} className="mt-0.5 shrink-0 text-zinc-400" /><div><div className="text-xs font-bold text-zinc-400">Bairro</div><div className="mt-1 font-bold text-zinc-900">{cliente.bairro || "Não informado"}</div></div></div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-violet-600"><Smartphone size={15} /> Contexto</div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-col gap-1 rounded-2xl bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between"><dt className="font-semibold text-zinc-500">Profissão</dt><dd className="font-bold text-zinc-900">{cliente.profissao || "Não informado"}</dd></div>
            <div className="flex flex-col gap-1 rounded-2xl bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between"><dt className="font-semibold text-zinc-500">Contato principal</dt><dd className="break-all font-bold text-zinc-900">{contato}</dd></div>
            <div className="flex flex-col gap-1 rounded-2xl bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between"><dt className="font-semibold text-zinc-500">Salão</dt><dd className="font-bold text-zinc-900">{salao?.nome || "Não identificado"}</dd></div>
            <div className="flex flex-col gap-1 rounded-2xl bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between"><dt className="font-semibold text-zinc-500">Responsável do salão</dt><dd className="font-bold text-zinc-900">{salao?.responsavel || "-"}</dd></div>
          </dl>
        </div>
      </section>
    </div>
  );
}
