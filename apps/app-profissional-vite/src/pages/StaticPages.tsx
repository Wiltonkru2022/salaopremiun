import { LifeBuoy, MessageCircle, Smartphone, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const SUPPORT_PHONE = "5567984341742";

export function SuportePage() {
  function chamarSuporte() {
    const mensagem = "Olá! Preciso de ajuda com o App Profissional do Salão Premiun.";
    window.open(
      `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(mensagem)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 text-white">
        <LifeBuoy className="text-amber-300" size={28} />
        <h2 className="mt-5 text-3xl font-black tracking-[-0.06em]">Suporte</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-zinc-300">
          Abra uma conversa com o suporte do Salão Premiun pelo WhatsApp.
        </p>
      </Card>
      <Button type="button" className="w-full" onClick={chamarSuporte}>
        <MessageCircle size={18} />
        Chamar suporte
      </Button>
    </div>
  );
}

export function DuvidasPage() {
  const items = [
    {
      pergunta: "Como bloquear horário?",
      resposta: "Abra a Agenda, escolha Bloquear horário, informe data, início, fim e o motivo do bloqueio."
    },
    {
      pergunta: "Como confirmar atendimento?",
      resposta: "Na Agenda, localize o atendimento pendente e toque em Confirmar. O botão fica bloqueado enquanto a confirmação é salva."
    },
    {
      pergunta: "Como abrir comanda?",
      resposta: "Entre em Comandas, toque em Nova comanda e escolha a cliente. Também é possível abrir como consumidor final."
    },
    {
      pergunta: "Como ajustar meus horários?",
      resposta: "Abra Perfil, toque em Ajustar horários, altere seu expediente e salve as configurações."
    }
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.pergunta}>
          <h3 className="font-black">{item.pergunta}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-zinc-500">{item.resposta}</p>
        </Card>
      ))}
    </div>
  );
}

export function InstalarPage() {
  return (
    <Card className="bg-zinc-950 text-white">
      <Smartphone className="text-amber-300" size={30} />
      <h2 className="mt-5 text-3xl font-black tracking-[-0.06em]">Instalar aplicativo</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-zinc-300">
        No Android, toque no menu do navegador e escolha Instalar app. No iPhone, toque em Compartilhar e depois em Adicionar à Tela de Início.
      </p>
    </Card>
  );
}

export function PrivacidadePage() {
  return (
    <Card>
      <ShieldCheck className="text-emerald-600" size={28} />
      <h2 className="mt-5 text-2xl font-black tracking-[-0.05em]">Privacidade e termos</h2>
      <p className="mt-3 text-sm font-semibold leading-7 text-zinc-600">
        O app usa dados de agenda, clientes e comandas somente para a operação do salão. Senhas não são exibidas na interface e as ações autenticadas usam os serviços seguros do sistema.
      </p>
    </Card>
  );
}
