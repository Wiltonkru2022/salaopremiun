import { createClient } from "@/lib/db/server";
import { getAuthProviderForSurface } from "@/lib/platform/provider-config.server";
import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

export type MfaAssurance = {
  aal: "aal1" | "aal2";
  subject: string | null;
};

export async function getMfaAssurance(): Promise<MfaAssurance> {
  if (getAuthProviderForSurface("painel") === "clerk") {
    const session = await readPainelClerkSession();
    if (!session) return { aal: "aal1", subject: null };
    return {
      aal: session.mfaVerified ? "aal2" : "aal1",
      subject: session.clerkSubject,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return { aal: "aal1", subject: null };

  return {
    aal: data.claims.aal === "aal2" ? "aal2" : "aal1",
    subject: String(data.claims.sub),
  };
}

/**
 * Sem MFA cadastrado, o acesso segue normalmente.
 * Se o provider do Painel for Clerk, a sessao interna ja registra se o segundo fator
 * foi exigido/concluido. No legado Supabase, mantemos a regra anterior.
 */
export async function hasAal2() {
  if (getAuthProviderForSurface("painel") === "clerk") {
    const session = await readPainelClerkSession();
    return Boolean(session?.mfaVerified);
  }

  const supabase = await createClient();
  const [{ data: assurance, error: assuranceError }, { data: factors, error: factorsError }] =
    await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);

  if (assuranceError || factorsError) return false;

  const verifiedTotpFactors = (factors?.totp || []).filter(
    (factor) => factor.status === "verified"
  );
  if (verifiedTotpFactors.length === 0) return true;

  return assurance.currentLevel === "aal2";
}
