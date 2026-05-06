import { createClient } from "@supabase/supabase-js";
import type { AnySupabaseDatabase } from "@/types/supabase";

type BlogSupabaseAdminClient = ReturnType<
  typeof createClient<AnySupabaseDatabase>
>;

const globalStore = globalThis as typeof globalThis & {
  __salaopremiumBlogSupabaseAdmin?: BlogSupabaseAdminClient;
  __salaopremiumBlogSupabasePublic?: BlogSupabaseAdminClient;
};

export function canUseBlogSupabasePublic() {
  return Boolean(
    String(process.env.BLOG_SUPABASE_URL || "").trim() &&
      String(process.env.BLOG_SUPABASE_ANON_KEY || "").trim()
  );
}

export function canUseBlogSupabaseAdmin() {
  return Boolean(
    String(process.env.BLOG_SUPABASE_URL || "").trim() &&
      String(process.env.BLOG_SUPABASE_SERVICE_ROLE_KEY || "").trim()
  );
}

function getBlogSupabaseUrl() {
  const value = process.env.BLOG_SUPABASE_URL;
  if (!value) {
    throw new Error("BLOG_SUPABASE_URL nao configurada.");
  }
  return value;
}

function getBlogPublishableKey() {
  const value = process.env.BLOG_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error("BLOG_SUPABASE_ANON_KEY nao configurada.");
  }
  return value;
}

function getBlogServiceRoleKey() {
  const value = process.env.BLOG_SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("BLOG_SUPABASE_SERVICE_ROLE_KEY nao configurada.");
  }
  return value;
}

export function getBlogSupabasePublic(): BlogSupabaseAdminClient {
  if (globalStore.__salaopremiumBlogSupabasePublic) {
    return globalStore.__salaopremiumBlogSupabasePublic;
  }

  globalStore.__salaopremiumBlogSupabasePublic =
    createClient<AnySupabaseDatabase>(
      getBlogSupabaseUrl(),
      getBlogPublishableKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            "x-application-name": "salaopremium-blog-public",
          },
        },
      }
    );

  return globalStore.__salaopremiumBlogSupabasePublic;
}

export function getBlogSupabaseAdmin(): BlogSupabaseAdminClient {
  if (typeof window !== "undefined") {
    throw new Error("getBlogSupabaseAdmin() nao pode ser usado no client.");
  }

  if (globalStore.__salaopremiumBlogSupabaseAdmin) {
    return globalStore.__salaopremiumBlogSupabaseAdmin;
  }

  globalStore.__salaopremiumBlogSupabaseAdmin =
    createClient<AnySupabaseDatabase>(
      getBlogSupabaseUrl(),
      getBlogServiceRoleKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            "x-application-name": "salaopremium-blog-admin",
          },
        },
      }
    );

  return globalStore.__salaopremiumBlogSupabaseAdmin;
}
