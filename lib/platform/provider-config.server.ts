export type DatabaseProvider = "neon";
export type AuthProvider = "clerk" | "internal";
export type MediaProvider = "cloudinary";
export type AuthSurface = "admin-master" | "painel" | "cliente" | "profissional";

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
  return Boolean(
    String(
      process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL || ""
    ).trim()
  );
}

export function getAuthProviderForSurface(surface: AuthSurface): AuthProvider {
  if (surface === "admin-master" || surface === "painel") return "clerk";
  // Cliente e profissional usam sessoes internas do produto, com credenciais
  // verificadas no servidor e dados persistidos exclusivamente no Neon.
  return "internal";
}

export function isClerkEnabledForSurface(surface: AuthSurface) {
  return getAuthProviderForSurface(surface) === "clerk";
}

export function getProviderConfig() {
  const neonUser = neonUserReady();
  const neonAdmin = neonAdminReady();
  const neonFull = neonUser && neonAdmin;
  const clerk = clerkReady();
  const cloudinary = cloudinaryReady();

  return {
    database: "neon" as const,
    adminAuth: "clerk" as const,
    adminMasterAuth: "clerk" as const,
    painelAuth: "clerk" as const,
    clienteAuth: "internal" as const,
    profissionalAuth: "internal" as const,
    media: "cloudinary" as const,
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
    rollbackMode: false,
  } as const;
}

export function assertProviderReadiness() {
  const config = getProviderConfig();
  if (!config.neonFullReady) {
    throw new Error(
      "Neon e obrigatorio: configure NEON_DATABASE_URL e NEON_ADMIN_DATABASE_URL."
    );
  }
  if (!config.clerkReady) {
    throw new Error(
      "Clerk e obrigatorio no Painel/Admin Master: configure as credenciais Clerk completas."
    );
  }
  if (!config.cloudinaryReady) {
    throw new Error(
      "Cloudinary e obrigatorio para midia: configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET."
    );
  }
  return config;
}
