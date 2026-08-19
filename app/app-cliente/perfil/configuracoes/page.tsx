import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientNotificationSettings from "@/components/client-app/ClientNotificationSettings";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const metadata = {
  title: "Configurações",
};

export default async function ClienteProfileSettingsPage() {
  const session = await requireClienteAppContext();
  const { data } = await (getSupabaseAdmin() as any)
    .from("clientes_app_auth")
    .select("notificacoes_ativas, notificacao_app_ativa, notificacao_email_ativa")
    .eq("id", session.idConta)
    .maybeSingle();

  const notificationSettings = {
    notificacoes_ativas: data?.notificacoes_ativas !== false,
    notificacao_app_ativa: data?.notificacao_app_ativa !== false,
    notificacao_email_ativa: data?.notificacao_email_ativa !== false,
  };

  return (
    <ClientAppFrame title="Configurações" subtitle="Preferências do app cliente.">
      <section className="mx-auto max-w-3xl px-4 py-4 md:px-6">
        <Link
          href="/app-cliente/perfil"
          className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={24} />
        </Link>

        <div className="rounded-[1.5rem] border border-zinc-100 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="mb-4">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Notificações</div>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-zinc-950">Como você quer ser avisada</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Controle lembretes e mensagens do app sem precisar desativar tudo.</p>
          </div>

          <ClientNotificationSettings initialSettings={notificationSettings} />

          <div className="mb-3 mt-7 rounded-xl bg-zinc-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Conta</div>
          <Link href="/app-cliente/recuperar-acesso" className="flex min-h-16 items-center justify-between border-b border-zinc-100 px-1 text-lg text-zinc-950">
            Alterar senha
            <ChevronRight size={26} className="text-zinc-300" />
          </Link>
          <div className="flex min-h-16 items-center justify-between border-b border-zinc-100 px-1 text-lg text-zinc-950">
            <span><span className="block text-sm text-zinc-500">Idioma</span>Automático (português)</span>
          </div>
          <div className="flex min-h-16 items-center justify-between px-1 text-lg text-zinc-950">
            <span><span className="block text-sm text-zinc-500">País</span>Brasil</span>
          </div>
        </div>
      </section>
    </ClientAppFrame>
  );
}
