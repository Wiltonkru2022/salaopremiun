import { Suspense } from "react";
import ProfissionalOnboarding from "@/components/profissional/ProfissionalOnboarding";

export const metadata = {
  title: "Primeiros passos | Salão Premium",
};

export default function ProfissionalOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <ProfissionalOnboarding />
    </Suspense>
  );
}

