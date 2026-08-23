"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { createClient } from "@/lib/supabase/client";

const ONBOARDING_PATH = "/onboarding-salao";

export default function PainelTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(pathname !== ONBOARDING_PATH);
  const [allowed, setAllowed] = useState(pathname === ONBOARDING_PATH);

  useEffect(() => {
    let active = true;

    async function checkOnboarding() {
      if (pathname === ONBOARDING_PATH) {
        if (active) {
          setAllowed(true);
          setChecking(false);
        }
        return;
      }

      try {
        setChecking(true);
        const usuario = await getUsuarioLogado();
        if (!usuario?.idSalao) {
          if (active) setAllowed(true);
          return;
        }

        const supabase = createClient();
        const { data, error } = await (supabase as any)
          .from("saloes")
          .select("onboarding_concluido")
          .eq("id", usuario.idSalao)
          .maybeSingle();

        if (error) throw error;

        if (data?.onboarding_concluido === false) {
          router.replace(ONBOARDING_PATH);
          if (active) setAllowed(false);
          return;
        }

        if (active) setAllowed(true);
      } catch (error) {
        console.error("[ONBOARDING_GATE_ERROR]", error);
        if (active) setAllowed(true);
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkOnboarding();
    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (checking || !allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-bold text-zinc-700 shadow-sm">
          <Loader2 size={18} className="animate-spin" />
          Preparando seu SalãoPremium...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
