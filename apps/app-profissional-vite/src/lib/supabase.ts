import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://example.supabase.co",
  supabaseAnonKey || "public-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "salaopremiun.auth"
    },
    realtime: {
      params: { eventsPerSecond: 8 }
    }
  }
);

export function cpfToAuthEmail(cpf: string) {
  const digits = cpf.replace(/\D/g, "");
  return `${digits}@profissional.salaopremiun.local`;
}
