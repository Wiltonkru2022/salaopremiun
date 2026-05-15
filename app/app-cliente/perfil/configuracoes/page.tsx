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
    .select("notificações_ativas, notificação_app_ativa, notificação_email_ativa")
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

        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <ClientNotificationSettings initialSettings={notificationSettings} />

          <div className="mb-3 mt-6 bg-zinc-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
            Conta
          </div>
          <Link
            href="/app-cliente/recuperar-acesso"
            className="flex min-h-16 items-center justify-between border-b border-zinc-100 px-1 text-lg text-zinc-950"
          >
            Alterar senha
            <ChevronRight size={26} className="text-zinc-300" />
          </Link>
          <div className="flex min-h-16 items-center justify-between border-b border-zinc-100 px-1 text-lg text-zinc-950">
            <span>
              <span className="block text-sm text-zinc-500">Idioma</span>
              Automatico (portugues)
            </span>
            <ChevronRight size={26} className="text-zinc-300" />
          </div>
          <div className="flex min-h-16 items-center justify-between px-1 text-lg text-zinc-950">
            <span>
              <span className="block text-sm text-zinc-500">Pais</span>
              Brasil
            </span>
            <ChevronRight size={26} className="text-zinc-300" />
          </div>
        </div>
      </section>
    </ClientAppFrame>
  );
}
