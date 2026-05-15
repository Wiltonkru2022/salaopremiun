import AppFaqList from "@/components/app-mobile/AppFaqList";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";

const faq = [
  {
    question: "Como vejo meus atendimentos?",
    answer:
      "Abra Agenda para ver os horários do dia. Toque em um atendimento para conferir cliente, serviço, status e ações disponíveis.",
  },
  {
    question: "Como crio um novo horário?",
    answer:
      "Na tela Início, toque em Novo horário. Selecione cliente, serviço, data e hora. O app avisa quando houver conflito no mesmo período.",
  },
  {
    question: "Como acompanho minhas comissões?",
    answer:
      "Abra Comissões no início ou no perfil. A tela mostra o resumo do mês e os lançamentos gerados pelas comandas fechadas.",
  },
  {
    question: "Como peço ajuda humana?",
    answer:
      "Abra Suporte, descreva o problema e envie o ticket. A equipe recebe seu pedido com o contexto do app profissional.",
  },
  {
    question: "Por que não consigo acessar uma função?",
    answer:
      "Algumas funções dependem do plano do salão, do vínculo do profissional ou de permissões definidas pelo salão. Se algo parecer bloqueado, abra um ticket.",
  },
];

export const metadata = {
  title: "Dúvidas",
};

export default function ProfissionalDuvidasPage() {
  return (
    <ProfissionalShell title="Dúvidas" subtitle="Ajuda rápida do app profissional.">
      <section className="mx-auto max-w-3xl py-2">
        <AppFaqList items={faq} />
      </section>
    </ProfissionalShell>
  );
}

