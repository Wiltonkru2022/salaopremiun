export type DatabaseProvider = "supabase" | "neon";
export type AdminAuthProvider = "supabase" | "clerk";
export type MediaProvider = "supabase" | "cloudinary";
export type AuthSurface = "admin-master" | "painel" | "cliente" | "profissional";

function normalizeProvider<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  const normalized = String(value || "").trim().toLowerCase() as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

function getLegacyAdminAuthProvider() {
  return normalizeProvider<AdminAuthProvider>(
    process.env.ADMIN_AUTH_PROVIDER,
    ["supabase", "clerk"],
    "supabase"
  );
}

export function getAuthProviderForSurface(surface: AuthSurface) {
  if (surface === "admin-master") {
    return normalizeProvider<AdminAuthProvider>(
      process.env.ADMIN_MASTER_AUTH_PROVIDER,
      ["supabase", "clerk"],
      getLegacyAdminAuthProvider()
    );
  }

  if (surface === "painel") {
    return normalizeProvider<AdminAuthProvider>(
      process.env.PAINEL_AUTH_PROVIDER,
      ["supabase", "clerk"],
      getLegacyAdminAuthProvider()
    );
  }

  // Cliente e Profissional continuam usando os fluxos próprios existentes.
  // Nunca devem ser migrados implicitamente quando algum provider administrativo mudar.
  return "supabase" as const;
}

export function isClerkEnabledForSurface(surface: AuthSurface) {
  return getAuthProviderForSurface(surface) === "clerk";
}

export function getProviderConfig() {
  const adminMasterAuth = getAuthProviderForSurface("admin-master");
  const painelAuth = getAuthProviderForSurface("painel");

  return {
    database: normalizeProvider<DatabaseProvider>(
      process.env.DATABASE_PROVIDER,
      ["supabase", "neon"],
      "supabase"
    ),
    adminAuth: getLegacyAdminAuthProvider(),
    adminMasterAuth,
    painelAuth,
    clienteAuth: getAuthProviderForSurface("cliente"),
    profissionalAuth: getAuthProviderForSurface("profissional"),
    media: normalizeProvider<MediaProvider>(
      process.env.MEDIA_PROVIDER,
      ["supabase", "cloudinary"],
      "supabase"
    ),
    neonReady: Boolean(process.env.NEON_DATABASE_URL),
    clerkReady: Boolean(
      process.env.CLERK_ISSUER_URL &&
        process.env.CLERK_JWKS_URL &&
        process.env.CLERK_SECRET_KEY &&
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ),
    cloudinaryReady: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    ),
    firebaseReady: Boolean(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
        (process.env.FIREBASE_PROJECT_ID &&
          process.env.FIREBASE_CLIENT_EMAIL &&
          (process.env.FIREBASE_PRIVATE_KEY ||
            process.env.FIREBASE_PRIVATE_KEY_BASE64))
    ),
  } as const;
}

export function assertProviderReadiness() {
  const config = getProviderConfig();
  if (config.database === "neon" && !config.neonReady) {
    throw new Error("DATABASE_PROVIDER=neon sem NEON_DATABASE_URL.");
  }
  if (
    (config.adminMasterAuth === "clerk" || config.painelAuth === "clerk") &&
    !config.clerkReady
  ) {
    throw new Error("Clerk ativo em área administrativa sem credenciais completas.");
  }
  if (config.media === "cloudinary" && !config.cloudinaryReady) {
    throw new Error(
      "MEDIA_PROVIDER=cloudinary sem credenciais Cloudinary."
    );
  }
  return config;
}
