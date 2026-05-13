"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PROFISSIONAL_ONBOARDING_DONE_KEY =
  "salaopremium:profissional:onboarding:v1";

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function ProfissionalInstallOnboardingGate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/app-profissional/onboarding")) return;
    if (
      pathname.startsWith("/app-profissional/login") ||
      pathname.startsWith("/app-profissional/recuperar-senha")
    ) {
      return;
    }
    if (!isStandaloneApp()) return;

    try {
      if (window.localStorage.getItem(PROFISSIONAL_ONBOARDING_DONE_KEY) === "1") {
        return;
      }
    } catch {
      return;
    }

    const query = searchParams.toString();
    const currentPath = query ? `${pathname}?${query}` : pathname;
    router.replace(
      `/app-profissional/onboarding?next=${encodeURIComponent(currentPath)}`
    );
  }, [pathname, router, searchParams]);

  return null;
}

export { PROFISSIONAL_ONBOARDING_DONE_KEY };

