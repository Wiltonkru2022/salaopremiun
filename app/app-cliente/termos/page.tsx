import ClientAppFrame from "@/components/client-app/ClientAppFrame";

export const metadata = {
  title: "Termos do App Cliente",
};

export default function ClienteTermosPage() {
  return (
    <ClientAppFrame title="Termos de uso" subtitle="Regras do App Cliente.">
      <article className="mx-auto max-w-3xl px-4 py-4 text-zinc-800 md:px-6">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <h1 className="text-2xl font-black tracking-[-0.04em] text-zinc-950">
            Termos do App Cliente
          </h1>
          <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
            <p>
              O App Cliente permite encontrar salões, consultar serviços,
              agendar horários, acompanhar visitas, receber notificações e
              avaliar atendimentos.
            </p>
            <p>
              O cliente deve manter seus dados corretos, comparecer no horário
              marcado e respeitar as regras de cancelamento, reagendamento e
              atendimento definidas pelo salão.
            </p>
            <p>
              O Salão Premium organiza a experiência digital, mas cada salão é
              responsável pelos serviços prestados, preços, profissionais,
              horários disponíveis e atendimento presencial.
            </p>
            <p>
              O uso indevido do app, mensagens ofensivas, tentativas de fraude
              ou abuso de agendamentos podem gerar bloqueio temporário ou
              definitivo da conta.
            </p>
          </div>
        </div>
      </article>
    </ClientAppFrame>
  );
}

