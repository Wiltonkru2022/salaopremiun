import { getDatabaseAdmin } from "@/lib/db/admin";

export class SalaoOperationalStateError extends Error {
  constructor(
    message: string,
    public status = 409,
    public code = "estado_operacional_invalido"
  ) {
    super(message);
    this.name = "SalaoOperationalStateError";
  }
}

export async function getSalaoOperationalState(idSalao: string) {
  const admin = getDatabaseAdmin() as any;
  const { data, error } = await admin
    .from("saloes")
    .select("onboarding_concluido, produtos_modulo_ativo, pix_modulo_ativo")
    .eq("id", idSalao)
    .maybeSingle();

  if (error || !data) {
    throw new SalaoOperationalStateError(
      error?.message || "Nao foi possivel validar o estado do salao.",
      503,
      "estado_salao_indisponivel"
    );
  }

  return {
    onboardingConcluido: data.onboarding_concluido === true,
    produtosModuloAtivo: data.produtos_modulo_ativo !== false,
    pixModuloAtivo: data.pix_modulo_ativo !== false,
  };
}

export async function assertSalaoOnboardingConcluido(idSalao: string) {
  const state = await getSalaoOperationalState(idSalao);
  if (!state.onboardingConcluido) {
    throw new SalaoOperationalStateError(
      "Finalize a configuracao inicial do salao antes de usar esta funcionalidade.",
      423,
      "onboarding_pendente"
    );
  }
  return state;
}

export async function assertProdutosModuloAtivo(idSalao: string) {
  const state = await assertSalaoOnboardingConcluido(idSalao);
  if (!state.produtosModuloAtivo) {
    throw new SalaoOperationalStateError(
      "Produtos e Estoque estao desativados para este salao.",
      409,
      "produtos_desativados"
    );
  }
  return state;
}
