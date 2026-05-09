"use client";

import Link from "next/link";
import { Bell, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";

const steps = [
  {
    title: "Bem-vindo ao Salao Premium",
    text: "Encontre saloes, veja servicos, escolha profissionais e agende sem precisar ligar.",
    icon: Sparkles,
    action: "Comecar",
  },
  {
    title: "Veja saloes perto de voce",
    text: "Use sua localizacao para encontrar opcoes proximas e chegar no horario certo.",
    icon: MapPin,
    action: "Permitir localizacao",
  },
  {
    title: "Nunca perca um agendamento",
    text: "Receba lembretes, mudancas de horario e avisos importantes do seu atendimento.",
    icon: Bell,
    action: "Ativar notificacoes",
  },
];

export default function ClientOnboarding() {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  async function continueFlow() {
    if (step === 1 && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => undefined,
        () => undefined,
        { maximumAge: 60_000, timeout: 5000 }
      );
    }
    if (step === 2 && "Notification" in window) {
      await Notification.requestPermission().catch(() => undefined);
    }
    if (!isLast) setStep((value) => value + 1);
  }

  return (
    <main className="flex min-h-dvh flex-col bg-white px-6 py-8 text-zinc-950">
      <div className="flex justify-end">
        <Link href="/app-cliente/inicio" className="text-sm font-black">
          Pular
        </Link>
      </div>

      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-10 flex h-56 w-full max-w-sm items-center justify-center">
          <div className="absolute inset-x-0 top-8 h-32 rounded-[3rem] bg-[repeating-linear-gradient(0deg,transparent_0,transparent_18px,rgba(199,162,92,0.35)_19px,transparent_21px)]" />
          <div className="relative flex h-36 w-36 items-center justify-center rounded-[2.5rem] bg-zinc-950 text-white shadow-[0_24px_60px_rgba(199,162,92,0.24)]">
            <Icon size={70} />
          </div>
        </div>
        <h1 className="max-w-lg text-4xl font-black tracking-[-0.05em]">
          {current.title}
        </h1>
        <p className="mt-6 max-w-lg text-xl leading-9 text-zinc-500">
          {current.text}
        </p>
      </section>

      {isLast ? (
        <Link
          href="/app-cliente/inicio"
          className="mb-4 flex h-14 items-center justify-center rounded-2xl bg-zinc-950 text-base font-black text-white"
        >
          Entrar no app
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => void continueFlow()}
          className="mb-4 h-14 rounded-2xl bg-zinc-950 text-base font-black text-white"
        >
          {current.action}
        </button>
      )}
    </main>
  );
}
