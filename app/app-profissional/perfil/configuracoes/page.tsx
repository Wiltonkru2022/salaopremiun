import ProfissionalNotificationSettings from "@/components/profissional/ProfissionalNotificationSettings";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

export default async function ConfiguracoesProfissionalPage() {
  const session = await requireProfissionalAppContext();
  const profissional = await runAdminOperation({
    action: "profissional_configuracoes_carregar",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("notificacoes_ativas, notificacao_app_ativa, notificacao_email_ativa")
        .eq("id", session.idProfissional)
        .eq("id_salao", session.idSalao)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
  });

  const row = profissional as {
    notificacoes_ativas?: boolean | null;
    notificacao_app_ativa?: boolean | null;
    notificacao_email_ativa?: boolean | null;
  } | null;

  const settings = {
    notificacoes_ativas: row?.notificacoes_ativas !== false,
    notificacao_app_ativa: row?.notificacao_app_ativa !== false,
    notificacao_email_ativa: row?.notificacao_email_ativa !== false,
  };

  return (
    <ProfissionalShell
      title="Configurações"
      subtitle="Preferências do App Profissional."
    >
      <section className="space-y-4 pb-8">
        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <ProfissionalNotificationSettings initialSettings={settings} />
        </div>
      </section>
    </ProfissionalShell>
  );
}
