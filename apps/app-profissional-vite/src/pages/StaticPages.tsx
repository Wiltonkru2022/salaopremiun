import { LifeBuoy, MessageCircle, Smartphone, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function SuportePage() {
  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 text-white">
        <LifeBuoy className="text-amber-300" size={28} />
        <h2 className="mt-5 text-3xl font-black tracking-[-0.06em]">Suporte</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-zinc-300">Abra uma conversa com a recepcao ou suporte do SalaoPremiun.</p>
      </Card>
      <Button className="w-full"><MessageCircle size={18} /> Chamar suporte</Button>
    </div>
  );
}

export function DuvidasPage() {
  const items = ["Como bloquear horario?", "Como confirmar atendimento?", "Como abrir comanda?", "Como ajustar meus horarios?"];
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item}>
          <h3 className="font-black">{item}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-zinc-500">Essa resposta sera conectada ao conteudo oficial do app profissional.</p>
        </Card>
      ))}
    </div>
  );
}

export function InstalarPage() {
  return (
    <Card className="bg-zinc-950 text-white">
      <Smartphone className="text-amber-300" size={30} />
      <h2 className="mt-5 text-3xl font-black tracking-[-0.06em]">Instalar PWA</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-zinc-300">
        No Android, toque no menu do navegador e escolha instalar app. No iPhone, use compartilhar e adicionar a tela de inicio.
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
        O app usa dados de agenda, clientes e comandas somente para operacao do salao. Senhas nao aparecem na tela e o login do teste usa uma RPC segura no Supabase.
      </p>
    </Card>
  );
}
