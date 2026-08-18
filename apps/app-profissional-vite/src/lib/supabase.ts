import { createClient } from "@supabase/supabase-js";

function requiredPublicEnv(name: string, value: string | undefined) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`Configuracao obrigatoria ausente: ${name}`);
  }
  return normalized;
}

const supabaseUrl = requiredPublicEnv(
  "VITE_SUPABASE_URL",
  import.meta.env.VITE_SUPABASE_URL as string | undefined
);
const supabasePublicKey = requiredPublicEnv(
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined
);

export const supabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabasePublicKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "salaopremiun.auth"
  },
  realtime: {
    params: { eventsPerSecond: 8 }
  }
});

export function cpfToAuthEmail(cpf: string) {
  const digits = cpf.replace(/\D/g, "");
  return `${digits}@profissional.salaopremiun.local`;
}
