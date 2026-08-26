import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

export type MfaAssurance = {
  aal: "aal1" | "aal2";
  subject: string | null;
};

export async function getMfaAssurance(): Promise<MfaAssurance> {
  const session = await readPainelClerkSession();
  if (!session) return { aal: "aal1", subject: null };

  return {
    aal: session.mfaVerified ? "aal2" : "aal1",
    subject: session.clerkSubject,
  };
}

export async function hasAal2() {
  const session = await readPainelClerkSession();
  return Boolean(session?.mfaVerified);
}
