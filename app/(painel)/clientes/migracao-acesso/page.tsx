import Link from "next/link";
import { redirect } from "next/navigation";
import MigrationCampaignList, { type MigrationClientRow } from "@/components/client-app/admin/MigrationCampaignList";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Migração do App Cliente" };

function realEmail(value?: string | null) {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.endsWith(".local")) return null;
  return email;
}

export default async function ClienteMigrationCampaignPage({
  searchParams,
}: {
  searchParams?: Promise<{ cliente?: string }>;
}) {
  const { usuario } = await getPainelUserContext();
  if (!usuario?.id_salao) redirect("/login?motivo=sessao_expirada");
  const nivel = String(usuario.nivel || "").toLowerCase();
  if (!new Set(["admin", "gerente"]).has(nivel)) redirect("/clientes?motivo=sem_permissao");

  const params = searchParams ? await searchParams : undefined;
  const clienteFiltro = String(params?.cliente || "").trim();

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("clientes")
    .select("id, nome, whatsapp, telefone, email, cpf, data_nascimento, status, ativo")
    .eq("id_salao", usuario.id_salao)
    .order("nome", { ascending: true })
    .limit(1000);
  if (error) throw error;

  const candidates = (rows || []).filter((row) => {
    const active = String(row.status || row.ativo || "ativo").toLowerCase();
    if (active === "inativo" || active === "false") return false;
    if (/cliente teste bloqueio/i.test(String(row.nome || ""))) return false;

    if (clienteFiltro) {
      return String(row.id || "") === clienteFiltro;
    }

    return !String(row.cpf || "").replace(/\D/g, "") || !String(row.data_nascimento || "").trim();
  });

  const ids = candidates.map((row) => row.id);
  const { data: authRows } = ids.length
    ? await supabase
        .from("clientes_auth")
        .select("id_cliente, app_conta_id, app_ativo")
        .eq("id_salao", usuario.id_salao)
        .in("id_cliente", ids)
    : { data: [] };

  const connected = new Set(
    (authRows || [])
      .filter((row) => row.app_conta_id && row.app_ativo !== false)
      .map((row) => String(row.id_cliente || ""))
  );

  const clients: MigrationClientRow[] = candidates.map((row) => ({
    id: String(row.id),
    nome: String(row.nome || "Cliente"),
    whatsapp: String(row.whatsapp || row.telefone || "").trim() || null,
    email: realEmail(row.email),
    appConectado: connected.has(String(row.id)),
    temCpf: String(row.cpf || "").replace(/\D/g, "").length === 11,
    temNascimento: Boolean(String(row.data_nascimento || "").trim()),
  }));

  const selectedClient = clienteFiltro ? clients[0] || null : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">App Cliente</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-zinc-950">
            {selectedClient ? `Atualizar acesso de ${selectedClient.nome}` : "Atualização para CPF + nascimento"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Gere links individuais. WhatsApp não é disparado por API: o botão abre seu WhatsApp normal com a mensagem pronta e você confirma o envio.
          </p>
        </div>
        <Link href="/clientes" className="inline-flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700">Voltar para clientes</Link>
      </div>

      {clienteFiltro && !selectedClient ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Este cliente não foi encontrado, está inativo ou não pode receber a atualização agora.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-zinc-950 p-4 text-white"><div className="text-3xl font-black">{clients.length}</div><div className="mt-1 text-xs text-zinc-300">cadastros exibidos</div></div>
        <div className="rounded-2xl bg-amber-50 p-4 text-amber-950"><div className="text-3xl font-black">{clients.filter((c) => c.appConectado).length}</div><div className="mt-1 text-xs">já usam o app</div></div>
        <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-950"><div className="text-3xl font-black">{clients.filter((c) => c.whatsapp).length}</div><div className="mt-1 text-xs">com WhatsApp para contato manual</div></div>
      </div>

      <div className="mt-7"><MigrationCampaignList clients={clients} /></div>
    </main>
  );
}
