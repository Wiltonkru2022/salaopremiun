import { createClient } from "@/lib/supabase/server";

export type MfaAssurance = {
  aal: "aal1" | "aal2";
  subject: string | null;
};

export async function getMfaAssurance(): Promise<MfaAssurance> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return { aal: "aal1", subject: null };
  }

  return {
    aal: data.claims.aal === "aal2" ? "aal2" : "aal1",
    subject: String(data.claims.sub),
  };
}

/**
 * MFA e uma protecao opcional.
 * - Sem fator TOTP verificado cadastrado: o acesso segue normalmente.
 * - Com fator TOTP verificado cadastrado: exige sessao AAL2.
 *
 * O nome hasAal2 foi mantido para compatibilidade com os guards existentes.
 */
export async function hasAal2() {
  const supabase = await createClient();
  const [{ data: assurance, error: assuranceError }, { data: factors, error: factorsError }] =
    await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);

  if (assuranceError || factorsError) {
    return false;
  }

  const verifiedTotpFactors = (factors?.totp || []).filter(
    (factor) => factor.status === "verified"
  );

  if (verifiedTotpFactors.length === 0) {
    return true;
  }

  return assurance.currentLevel === "aal2";
}
