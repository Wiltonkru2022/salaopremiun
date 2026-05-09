"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const ONBOARDING_DONE_KEY = "salaopremium:cliente:onboarding:v1";

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function ClientInstallOnboardingGate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/app-cliente/onboarding")) return;
    if (!isStandaloneApp()) return;

    try {
      if (window.localStorage.getItem(ONBOARDING_DONE_KEY) === "1") return;
    } catch {
      return;
    }

    const query = searchParams.toString();
    const currentPath = query ? `${pathname}?${query}` : pathname;
    router.replace(
      `/app-cliente/onboarding?next=${encodeURIComponent(currentPath)}`
    );
  }, [pathname, router, searchParams]);

  return null;
}

export { ONBOARDING_DONE_KEY };
