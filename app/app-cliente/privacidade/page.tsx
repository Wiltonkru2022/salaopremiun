import ClientAppFrame from "@/components/client-app/ClientAppFrame";

export const metadata = {
  title: "Privacidade do App Cliente | Salão Premium",
};

export default function ClientePrivacidadePage() {
  return (
    <ClientAppFrame title="Privacidade" subtitle="Como seus dados são usados.">
      <article className="mx-auto max-w-3xl px-4 py-4 text-zinc-800 md:px-6">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <h1 className="text-2xl font-black tracking-[-0.04em] text-zinc-950">
            Privacidade do App Cliente
          </h1>
          <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
            <p>
              Coletamos dados como nome, telefone, e-mail, agendamentos,
              avaliações e preferências de notificação para operar sua conta e
              melhorar a experiência com os salões.
            </p>
            <p>
              Seus dados são usados para autenticação, confirmação de horários,
              lembretes, suporte, avaliações e histórico de atendimento.
            </p>
            <p>
              Quando você agenda com um salão, os dados necessários do
              atendimento são compartilhados com esse salão para execução do
              serviço.
            </p>
            <p>
              Você pode solicitar suporte, atualização de dados ou recuperação
              de acesso pelos canais disponíveis no perfil do app.
            </p>
          </div>
        </div>
      </article>
    </ClientAppFrame>
  );
}

