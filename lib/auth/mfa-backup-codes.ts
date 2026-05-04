import crypto from "node:crypto";

export type SalaoPremiumMfaMetadata = {
  backup_code_hashes?: string[];
  backup_codes_generated_at?: string | null;
  backup_codes_last_used_at?: string | null;
  failed_attempts?: number;
  locked_until?: string | null;
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const BACKUP_CODE_COUNT = 10;

function getBackupCodeSecret() {
  return (
    process.env.MFA_BACKUP_CODES_SECRET ||
    process.env.PASSWORD_REUSE_SECRET ||
    ""
  );
}

export function assertBackupCodeSecret() {
  const secret = getBackupCodeSecret();

  if (!secret) {
    throw new Error(
      "MFA_BACKUP_CODES_SECRET nao configurado. Use PASSWORD_REUSE_SECRET como fallback apenas se necessario."
    );
  }

  return secret;
}

export function normalizeBackupCode(input: string) {
  return String(input || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function hashBackupCode(params: {
  authUserId: string;
  code: string;
}) {
  const secret = assertBackupCodeSecret();
  const normalized = normalizeBackupCode(params.code);

  return crypto
    .createHmac("sha256", `${secret}:${params.authUserId}`)
    .update(normalized)
    .digest("hex");
}

function buildReadableChunk() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(4);

  return Array.from(bytes)
    .map((value) => alphabet[value % alphabet.length])
    .join("");
}

export function generateBackupCodes() {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    return `${buildReadableChunk()}-${buildReadableChunk()}`;
  });
}

export function buildBackupMetadata(params: {
  authUserId: string;
  codes: string[];
}): SalaoPremiumMfaMetadata {
  return {
    backup_code_hashes: params.codes.map((code) =>
      hashBackupCode({ authUserId: params.authUserId, code })
    ),
    backup_codes_generated_at: new Date().toISOString(),
    backup_codes_last_used_at: null,
    failed_attempts: 0,
    locked_until: null,
  };
}

export function getRemainingBackupCodeCount(
  metadata: SalaoPremiumMfaMetadata | null | undefined
) {
  return Array.isArray(metadata?.backup_code_hashes)
    ? metadata!.backup_code_hashes!.length
    : 0;
}

export function isBackupCodeLocked(
  metadata: SalaoPremiumMfaMetadata | null | undefined
) {
  if (!metadata?.locked_until) return false;

  return new Date(metadata.locked_until).getTime() > Date.now();
}

export function buildBackupCodeFailureState(
  metadata: SalaoPremiumMfaMetadata | null | undefined
): SalaoPremiumMfaMetadata {
  const failedAttempts = (metadata?.failed_attempts || 0) + 1;
  const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

  return {
    ...metadata,
    failed_attempts: shouldLock ? 0 : failedAttempts,
    locked_until: shouldLock
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
      : null,
  };
}

export function consumeBackupCode(params: {
  authUserId: string;
  code: string;
  metadata: SalaoPremiumMfaMetadata | null | undefined;
}) {
  const hashes = Array.isArray(params.metadata?.backup_code_hashes)
    ? [...params.metadata!.backup_code_hashes!]
    : [];

  const hashedInput = hashBackupCode({
    authUserId: params.authUserId,
    code: params.code,
  });

  const index = hashes.indexOf(hashedInput);

  if (index === -1) {
    return {
      ok: false as const,
      metadata: buildBackupCodeFailureState(params.metadata),
    };
  }

  hashes.splice(index, 1);

  return {
    ok: true as const,
    metadata: {
      ...params.metadata,
      backup_code_hashes: hashes,
      backup_codes_last_used_at: new Date().toISOString(),
      failed_attempts: 0,
      locked_until: null,
    } satisfies SalaoPremiumMfaMetadata,
  };
}

export function clearBackupMetadata(): SalaoPremiumMfaMetadata {
  return {
    backup_code_hashes: [],
    backup_codes_generated_at: null,
    backup_codes_last_used_at: null,
    failed_attempts: 0,
    locked_until: null,
  };
}
