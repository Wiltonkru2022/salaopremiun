declare module "@supabase/supabase-js" {
  export type SupabaseClient<Database = any, SchemaName = any, Schema = any> = any;
  export type Session = any;
  export type User = any;
  export type AuthError = any;
  export type PostgrestError = any;
  export type RealtimeChannel = any;
  export type RealtimePostgresChangesPayload<T = any> = any;
}

declare module "@supabase/ssr" {
  export type CookieOptions = Record<string, unknown>;
}
