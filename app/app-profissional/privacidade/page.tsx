import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";

export const metadata = {
  title: "Privacidade do App Profissional | Salão Premium",
};

export default function ProfissionalPrivacidadePage() {
  return (
    <ProfissionalShell title="Privacidade" subtitle="Dados do profissional no app.">
      <article className="mx-auto max-w-3xl py-2 text-zinc-800">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <h1 className="text-2xl font-black tracking-[-0.04em] text-zinc-950">
            Privacidade do App Profissional
          </h1>
          <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
            <p>
              O app usa dados como nome, contato, vínculo com o salão, agenda,
              atendimentos, comandas, avaliações e comissões para operar sua
              rotina profissional.
            </p>
            <p>
              Essas informações são usadas para autenticação, exibição de agenda,
              registro de atendimento, cálculo de repasses, notificações e
              suporte.
            </p>
            <p>
              O salão pode visualizar dados relacionados à operação, pois é o
              responsável pelo vínculo profissional e pela configuração das
              permissões.
            </p>
            <p>
              Se houver erro nos seus dados, solicite atualização ao salão ou
              abra suporte pelo app.
            </p>
          </div>
        </div>
      </article>
    </ProfissionalShell>
  );
}

