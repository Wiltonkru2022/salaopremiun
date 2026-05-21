"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Bell, Check, ChevronRight, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";
import { ONBOARDING_DONE_KEY } from "@/components/client-app/ClientInstallOnboardingGate";

const steps = [
  {
    title: "Bem-vindo ao Salão Premium",
    text: "Encontre salões, veja serviços, escolha profissionais e agende sem precisar ligar.",
    icon: Sparkles,
    action: "Comecar",
  },
  {
    title: "Veja salões perto de você",
    text: "Use sua localização para encontrar opções próximas e chegar no horário certo.",
    icon: MapPin,
    action: "Próximo",
  },
  {
    title: "Nunca perca um agendamento",
    text: "Receba lembretes, mudancas de horário e avisos importantes do seu atendimento.",
    icon: Bell,
    action: "Finalizar",
  },
];

type DocumentWithGeolocationPolicy = Document & {
  permissionsPolicy?: { allowsFeature(feature: string): boolean };
  featurePolicy?: { allowsFeature(feature: string): boolean };
};

function canRequestGeolocation() {
  if (!("geolocation" in navigator)) return false;

  const documentWithPolicy = document as DocumentWithGeolocationPolicy;
  const policy =
    documentWithPolicy.permissionsPolicy || documentWithPolicy.featurePolicy;

  return policy?.allowsFeature ? policy.allowsFeature("geolocation") : true;
}

export default function ClientOnboarding() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;
  const next = searchParams.get("next") || "/app-cliente";

  function finishFlow() {
    try {
      window.localStorage.setItem(ONBOARDING_DONE_KEY, "1");
    } catch {
      // Navegadores restritos podem bloquear storage; o app segue normalmente.
    }
    router.replace(next.startsWith("/app-cliente") ? next : "/app-cliente");
  }

  async function continueFlow() {
    if (step === 1 && canRequestGeolocation()) {
      navigator.geolocation.getCurrentPosition(
        () => undefined,
        () => undefined,
        { maximumAge: 60_000, timeout: 5000 }
      );
    }
    if (step === 2 && "Notification" in window) {
      await Notification.requestPermission().catch(() => undefined);
    }

    if (isLast) {
      finishFlow();
      return;
    }

    setStep((value) => value + 1);
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden bg-white px-6 py-8 text-zinc-950">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={finishFlow}
          className="text-sm font-black text-zinc-800"
        >
          Pular
        </button>
      </div>

      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-8 flex items-center gap-2">
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={`h-2.5 rounded-full transition-all ${
                index === step
                  ? "w-10 bg-zinc-950"
                  : index < step
                    ? "w-2.5 bg-amber-500"
                    : "w-2.5 bg-zinc-200"
              }`}
            />
          ))}
        </div>

        <div className="relative mb-10 flex h-60 w-full max-w-sm items-center justify-center">
          <div className="absolute inset-x-2 top-8 h-36 rounded-[3rem] bg-[repeating-linear-gradient(0deg,transparent_0,transparent_18px,rgba(199,162,92,0.32)_19px,transparent_21px)]" />
          <div className="absolute h-52 w-52 rounded-full bg-amber-100/70 blur-2xl" />
          <div className="relative flex h-36 w-36 items-center justify-center rounded-[2.5rem] bg-zinc-950 text-white shadow-[0_24px_60px_rgba(199,162,92,0.24)]">
            <Icon size={70} />
          </div>
          {isLast ? (
            <span className="absolute bottom-7 right-14 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white shadow-xl">
              <Check size={24} strokeWidth={3} />
            </span>
          ) : null}
        </div>
        <h1 className="max-w-lg text-4xl font-black tracking-[-0.05em] text-zinc-950">
          {current.title}
        </h1>
        <p className="mt-6 max-w-lg text-xl leading-9 text-zinc-500">
          {current.text}
        </p>
      </section>

      <button
        type="button"
        onClick={() => void continueFlow()}
        className="mb-4 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-zinc-950 text-base font-black text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]"
      >
        {step === 0 ? "Próximo" : current.action}
        <ChevronRight size={20} />
      </button>
    </main>
  );
}
