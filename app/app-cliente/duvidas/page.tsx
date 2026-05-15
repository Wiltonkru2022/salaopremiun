import AppFaqList from "@/components/app-mobile/AppFaqList";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";

const faq = [
  {
    question: "Como faço um agendamento?",
    answer:
      "Entre em Explorar, escolha um salão, selecione serviço, profissional, data e horário. Antes de confirmar, confira o resumo para saber exatamente o que será reservado.",
  },
  {
    question: "Posso cancelar ou reagendar?",
    answer:
      "Sim. Abra Agenda, toque no atendimento e use Cancelar ou Reagendar quando o salão permitir. O horário é liberado para o salão e as partes recebem aviso.",
  },
  {
    question: "Onde vejo notificações?",
    answer:
      "As notificações ficam no sininho do topo e também no menu do app. Elas mostram avisos de horário, confirmação, avaliação e mudanças importantes.",
  },
  {
    question: "Meus dados ficam seguros?",
    answer:
      "Sim. O app usa autenticação segura, mantém sua sessão protegida e usa seus dados apenas para cadastro, agenda, atendimento e comunicação com o salão.",
  },
  {
    question: "Como falo com suporte?",
    answer:
      "No Perfil, abra Comentários e suporte. Você será direcionado para um atendimento humano com o contexto do app.",
  },
];

export const metadata = {
  title: "Dúvidas",
};

export default function ClienteDuvidasPage() {
  return (
    <ClientAppFrame title="Dúvidas" subtitle="Respostas rápidas sobre o app.">
      <section className="mx-auto max-w-3xl px-4 py-4 md:px-6">
        <AppFaqList items={faq} />
      </section>
    </ClientAppFrame>
  );
}

