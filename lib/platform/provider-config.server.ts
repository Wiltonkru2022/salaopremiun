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

function rollbackMode() {
  return String(process.env.PROVIDER_ROLLBACK_MODE || "").trim() === "1";
}

function clerkReady() {
  return Boolean(
    process.env.CLERK_ISSUER_URL &&
      process.env.CLERK_JWKS_URL &&
      process.env.CLERK_SECRET_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  );
}

function cloudinaryReady() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function neonUserReady() {
  return Boolean(String(process.env.NEON_DATABASE_URL || "").trim());
}

function neonAdminReady() {
  return Boolean(String(process.env.NEON_ADMIN_DATABASE_URL || "").trim());
}

function getLegacyAdminAuthProvider() {
  if (!rollbackMode() && clerkReady()) return "clerk" as const;
  return normalizeProvider<AdminAuthProvider>(
    process.env.ADMIN_AUTH_PROVIDER,
    ["supabase", "clerk"],
    "supabase"
  );
}

function configuredSurfaceProvider(
  envValue: string | undefined,
  fallback: AdminAuthProvider
) {
  if (!rollbackMode() && clerkReady()) {
    return normalizeProvider<AdminAuthProvider>(
      envValue,
      ["supabase", "clerk"],
      "clerk"
    );
  }
  return normalizeProvider<AdminAuthProvider>(
    envValue,
    ["supabase", "clerk"],
    fallback
  );
}

export function getAuthProviderForSurface(surface: AuthSurface) {
  if (surface === "admin-master") {
    return configuredSurfaceProvider(
      process.env.ADMIN_MASTER_AUTH_PROVIDER,
      getLegacyAdminAuthProvider()
    );
  }

  if (surface === "painel") {
    return configuredSurfaceProvider(
      process.env.PAINEL_AUTH_PROVIDER,
      getLegacyAdminAuthProvider()
    );
  }

  if (surface === "cliente") {
    return configuredSurfaceProvider(
      process.env.CLIENTE_AUTH_PROVIDER,
      "supabase"
    );
  }

  return configuredSurfaceProvider(
    process.env.PROFISSIONAL_AUTH_PROVIDER,
    "supabase"
  );
}

export function isClerkEnabledForSurface(surface: AuthSurface) {
  return getAuthProviderForSurface(surface) === "clerk";
}

export function getProviderConfig() {
  const adminMasterAuth = getAuthProviderForSurface("admin-master");
  const painelAuth = getAuthProviderForSurface("painel");
  const clienteAuth = getAuthProviderForSurface("cliente");
  const profissionalAuth = getAuthProviderForSurface("profissional");
  const neonUser = neonUserReady();
  const neonAdmin = neonAdminReady();
  const neonFull = neonUser && neonAdmin;
  const clerk = clerkReady();
  const cloudinary = cloudinaryReady();

  const database: DatabaseProvider =
    !rollbackMode() && neonFull
      ? "neon"
      : normalizeProvider<DatabaseProvider>(
          process.env.DATABASE_PROVIDER,
          ["supabase", "neon"],
          "supabase"
        );

  const media: MediaProvider =
    !rollbackMode() && cloudinary
      ? "cloudinary"
      : normalizeProvider<MediaProvider>(
          process.env.MEDIA_PROVIDER,
          ["supabase", "cloudinary"],
          "supabase"
        );

  return {
    database,
    adminAuth: getLegacyAdminAuthProvider(),
    adminMasterAuth,
    painelAuth,
    clienteAuth,
    profissionalAuth,
    media,
    neonReady: neonUser,
    neonUserReady: neonUser,
    neonAdminReady: neonAdmin,
    neonFullReady: neonFull,
    clerkReady: clerk,
    cloudinaryReady: cloudinary,
    firebaseReady: Boolean(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
        (process.env.FIREBASE_PROJECT_ID &&
          process.env.FIREBASE_CLIENT_EMAIL &&
          (process.env.FIREBASE_PRIVATE_KEY ||
            process.env.FIREBASE_PRIVATE_KEY_BASE64))
    ),
    rollbackMode: rollbackMode(),
  } as const;
}

export function assertProviderReadiness() {
  const config = getProviderConfig();
  if (config.database === "neon" && !config.neonFullReady) {
    throw new Error(
      "Neon ativo exige NEON_DATABASE_URL e NEON_ADMIN_DATABASE_URL."
    );
  }
  if (
    [
      config.adminMasterAuth,
      config.painelAuth,
      config.clienteAuth,
      config.profissionalAuth,
    ].includes("clerk") &&
    !config.clerkReady
  ) {
    throw new Error("Clerk ativo em uma superficie sem credenciais completas.");
  }
  if (config.media === "cloudinary" && !config.cloudinaryReady) {
    throw new Error("Cloudinary ativo sem credenciais completas.");
  }
  return config;
}
