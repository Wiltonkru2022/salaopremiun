import { NextRequest, NextResponse } from "next/server";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { clerkAdminApi } from "@/lib/platform/clerk-admin-api.server";
import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";
import {
  buildBackupMetadata,
  clearBackupMetadata,
  consumeBackupCode,
  getRemainingBackupCodeCount,
  isSensitiveActionLocked,
  type SalaoPremiumMfaMetadata,
  generateBackupCodes,
  isBackupCodeLocked,
} from "@/lib/auth/mfa-backup-codes";

type Action =
  | "generate_backup_codes"
  | "consume_backup_code"
  | "disable_factor";

type RequestBody = {
  action?: Action;
  backupCode?: string;
  method?: "aal2" | "backup_code";
};

const APP_METADATA_KEY = "salaopremium_mfa";

async function getAuthenticatedContext() {
  const session = await readPainelClerkSession();
  if (!session) {
    throw new Error("Sessao invalida.");
  }

  if (!session.idSalao) {
    throw new Error("Nao foi possivel identificar o salao do usuario.");
  }

  if (session.status && session.status !== "ativo") {
    throw new Error("Usuario inativo.");
  }

  const admin = getDatabaseAdmin();
  const { data: authUserData, error: authUserError } =
    await clerkAdminApi.getUserById(session.clerkSubject);

  if (authUserError || !authUserData?.user) {
    throw new Error("Não foi possível carregar a conta autenticada.");
  }

  const { data: factorsData, error: factorError } =
    await clerkAdminApi.mfa.listFactors({
      userId: session.clerkSubject,
    });

  if (factorError) {
    throw new Error("Não foi possível carregar a verificação em duas etapas.");
  }

  const totpFactor =
    factorsData?.factors?.find(
      (factor) => factor.factor_type === "totp" && factor.status === "verified"
    ) || null;

  const currentLevel: "aal1" | "aal2" = session.mfaVerified ? "aal2" : "aal1";
  const appMetadata = (authUserData.user.privateMetadata ||
    {}) as Record<string, unknown>;
  const mfaMetadata =
    (appMetadata[APP_METADATA_KEY] as SalaoPremiumMfaMetadata | undefined) ||
    null;

  return {
    admin,
    authUser: authUserData.user,
    clerkSubject: session.clerkSubject,
    idSalao: session.idSalao,
    currentLevel,
    totpFactor,
    mfaMetadata,
  };
}

async function persistMfaMetadata(params: {
  authUserId: string;
  nextMetadata: SalaoPremiumMfaMetadata;
}) {
  const { data, error } = await clerkAdminApi.getUserById(params.authUserId);

  if (error || !data?.user) {
    throw new Error("Não foi possível atualizar o autenticador da conta.");
  }

  const currentAppMetadata = (data.user.privateMetadata ||
    {}) as Record<string, unknown>;

  const { error: updateError } = await clerkAdminApi.updateUserById(
    params.authUserId,
    {
      privateMetadata: {
        ...currentAppMetadata,
        [APP_METADATA_KEY]: params.nextMetadata,
      },
    }
  );

  if (updateError) {
    throw new Error(
      "Não foi possível salvar os códigos de recuperação."
    );
  }
}

export async function GET() {
  try {
    const ctx = await getAuthenticatedContext();

    return NextResponse.json({
      ok: true,
      provider: "clerk",
      factorActive: Boolean(ctx.totpFactor),
      currentLevel: ctx.currentLevel,
      backupCodesRemaining: getRemainingBackupCodeCount(ctx.mfaMetadata),
      backupCodesLockedUntil: ctx.mfaMetadata?.locked_until || null,
      backupCodesGeneratedAt: ctx.mfaMetadata?.backup_codes_generated_at || null,
      backupCodesLastUsedAt: ctx.mfaMetadata?.backup_codes_last_used_at || null,
      sensitiveActionLockedUntil:
        isSensitiveActionLocked(ctx.mfaMetadata)
          ? ctx.mfaMetadata?.recovery_lock_until || null
          : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao consultar MFA.";
    const status =
      message === "Sessao invalida."
        ? 401
        : message === "Usuario inativo."
          ? 403
          : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const ctx = await getAuthenticatedContext();

    if (body.action === "generate_backup_codes") {
      if (!ctx.totpFactor) {
        return NextResponse.json(
          { ok: false, error: "Nenhum autenticador ativo foi encontrado." },
          { status: 400 }
        );
      }

      if (ctx.currentLevel !== "aal2") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Confirme o autenticador nesta sessão antes de gerar novos códigos de recuperação.",
          },
          { status: 403 }
        );
      }

      const codes = generateBackupCodes();
      const nextMetadata = buildBackupMetadata({
        authUserId: ctx.authUser.id,
        codes,
      });

      await persistMfaMetadata({
        authUserId: ctx.authUser.id,
        nextMetadata,
      });

      return NextResponse.json({
        ok: true,
        codes,
        backupCodesRemaining: codes.length,
      });
    }

    if (body.action === "consume_backup_code") {
      if (!ctx.totpFactor) {
        return NextResponse.json(
          { ok: false, error: "Nenhum autenticador ativo foi encontrado." },
          { status: 400 }
        );
      }

      if (isBackupCodeLocked(ctx.mfaMetadata)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Backup codes temporariamente bloqueados por excesso de tentativas.",
            lockedUntil: ctx.mfaMetadata?.locked_until || null,
          },
          { status: 429 }
        );
      }

      if (!body.backupCode?.trim()) {
        return NextResponse.json(
          { ok: false, error: "Informe um backup code valido." },
          { status: 400 }
        );
      }

      const result = consumeBackupCode({
        authUserId: ctx.authUser.id,
        code: body.backupCode,
        metadata: ctx.mfaMetadata,
      });

      await persistMfaMetadata({
        authUserId: ctx.authUser.id,
        nextMetadata: result.metadata,
      });

      if (!result.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "Backup code invalido.",
            lockedUntil: result.metadata.locked_until || null,
            backupCodesRemaining: getRemainingBackupCodeCount(result.metadata),
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        backupCodesRemaining: getRemainingBackupCodeCount(result.metadata),
      });
    }

    if (body.action === "disable_factor") {
      if (!ctx.totpFactor) {
        return NextResponse.json(
          { ok: false, error: "Nenhum autenticador ativo foi encontrado." },
          { status: 400 }
        );
      }

      if (body.method === "backup_code") {
        if (isBackupCodeLocked(ctx.mfaMetadata)) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Backup codes temporariamente bloqueados por excesso de tentativas.",
              lockedUntil: ctx.mfaMetadata?.locked_until || null,
            },
            { status: 429 }
          );
        }

        if (!body.backupCode?.trim()) {
          return NextResponse.json(
            { ok: false, error: "Informe um backup code valido." },
            { status: 400 }
          );
        }

        const consumeResult = consumeBackupCode({
          authUserId: ctx.authUser.id,
          code: body.backupCode,
          metadata: ctx.mfaMetadata,
        });

        await persistMfaMetadata({
          authUserId: ctx.authUser.id,
          nextMetadata: consumeResult.metadata,
        });

        if (!consumeResult.ok) {
          return NextResponse.json(
            {
              ok: false,
              error: "Backup code invalido.",
              lockedUntil: consumeResult.metadata.locked_until || null,
            },
            { status: 400 }
          );
        }
      } else if (ctx.currentLevel !== "aal2") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Confirme o autenticador nesta sessão antes de desativar a proteção.",
          },
          { status: 403 }
        );
      }

      const { error: deleteError } = await clerkAdminApi.mfa.deleteFactor({
        id: ctx.totpFactor.id,
        userId: ctx.clerkSubject,
      });

      if (deleteError) {
        return NextResponse.json(
          {
            ok: false,
            error:
              deleteError.message ||
              "Não foi possível desativar o autenticador.",
          },
          { status: 400 }
        );
      }

      await persistMfaMetadata({
        authUserId: ctx.authUser.id,
        nextMetadata: clearBackupMetadata(),
      });

      return NextResponse.json({
        ok: true,
        requiresReauth: true,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Acao MFA invalida." },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao processar MFA.";
    const status =
      message === "Sessao invalida."
        ? 401
        : message === "Usuario inativo."
          ? 403
          : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
