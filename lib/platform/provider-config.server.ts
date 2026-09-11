export type DatabaseProvider = "supabase";
export type AdminAuthProvider = "supabase" | "clerk";
export type MediaProvider = "supabase" | "cloudinary";

function normalizeProvider<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  const normalized = String(value || "").trim().toLowerCase() as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

export function getProviderConfig() {
  return {
    database: "supabase" as const,
    adminAuth: normalizeProvider<AdminAuthProvider>(process.env.ADMIN_AUTH_PROVIDER, ["supabase", "clerk"], "supabase"),
    media: normalizeProvider<MediaProvider>(process.env.MEDIA_PROVIDER, ["supabase", "cloudinary"], "supabase"),
    clerkReady: Boolean(process.env.CLERK_ISSUER_URL && process.env.CLERK_JWKS_URL),
    cloudinaryReady: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    firebaseReady: Boolean(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY_BASE64))
    ),
  } as const;
}

export function assertProviderReadiness() {
  const config = getProviderConfig();
  if (config.adminAuth === "clerk" && !config.clerkReady) throw new Error("ADMIN_AUTH_PROVIDER=clerk sem credenciais Clerk.");
  if (config.media === "cloudinary" && !config.cloudinaryReady) throw new Error("MEDIA_PROVIDER=cloudinary sem credenciais Cloudinary.");
  return config;
}
