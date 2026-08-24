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

export async function hasAal2() {
  return (await getMfaAssurance()).aal === "aal2";
}
