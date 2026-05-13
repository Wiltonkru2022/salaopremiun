import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";

export const metadata = {
  title: "Suporte | Salão Premium",
};

export default function ClienteSuportePage() {
  const whatsapp = "https://wa.me/5567984341742?text=Olá,%20preciso%20de%20ajuda%20no%20App%20Cliente%20Salão%20Premium.";

  return (
    <ClientAppFrame title="Suporte" subtitle="Atendimento humano para o cliente.">
      <section className="mx-auto max-w-3xl px-4 py-4 md:px-6">
        <div className="rounded-[1.5rem] bg-zinc-950 p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-amber-100">
            <MessageCircle size={24} />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            Fale com o suporte
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Use este canal para dúvidas sobre acesso, agendamentos, avaliações,
            notificações ou dados da sua conta.
          </p>
          <Link
            href={whatsapp}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-zinc-950"
          >
            <Phone size={18} />
            Abrir WhatsApp
          </Link>
        </div>
      </section>
    </ClientAppFrame>
  );
}

