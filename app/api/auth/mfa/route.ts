import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildBackupMetadata,
  clearBackupMetadata,
  consumeBackupCode,
  getRemainingBackupCodeCount,
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
  const supabase = await createClient();
  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Sessao invalida.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id_salao, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError || !usuario?.id_salao) {
    throw new Error("Nao foi possivel identificar o salao do usuario.");
  }

  if (usuario.status && usuario.status !== "ativo") {
    throw new Error("Usuario inativo.");
  }

  const { data: authUserData, error: authUserError } =
    await supabaseAdmin.auth.admin.getUserById(user.id);

  if (authUserError || !authUserData?.user) {
    throw new Error("Nao foi possivel carregar a conta autenticada.");
  }

  const { data: factorsData, error: factorError } =
    await supabaseAdmin.auth.admin.mfa.listFactors({
      userId: user.id,
    });

  if (factorError) {
    throw new Error(factorError.message || "Erro ao carregar fatores MFA.");
  }

  const totpFactor =
    factorsData?.factors?.find(
      (factor) => factor.factor_type === "totp" && factor.status === "verified"
    ) || null;

  let currentLevel: "aal1" | "aal2" | null = null;

  if (session?.access_token) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(
      session.access_token
    );
    currentLevel =
      (aalData?.currentLevel as "aal1" | "aal2" | null | undefined) ?? null;
  }

  const appMetadata = (authUserData.user.app_metadata ||
    {}) as Record<string, unknown>;
  const mfaMetadata =
    (appMetadata[APP_METADATA_KEY] as SalaoPremiumMfaMetadata | undefined) ||
    null;

  return {
    supabaseAdmin,
    authUser: authUserData.user,
    idSalao: usuario.id_salao,
    currentLevel,
    totpFactor,
    mfaMetadata,
  };
}

async function persistMfaMetadata(params: {
  authUserId: string;
  nextMetadata: SalaoPremiumMfaMetadata;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(
    params.authUserId
  );

  if (error || !data?.user) {
    throw new Error("Nao foi possivel atualizar a conta do autenticador.");
  }

  const currentAppMetadata = (data.user.app_metadata ||
    {}) as Record<string, unknown>;

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    params.authUserId,
    {
      app_metadata: {
        ...currentAppMetadata,
        [APP_METADATA_KEY]: params.nextMetadata,
      },
    }
  );

  if (updateError) {
    throw new Error(
      updateError.message || "Nao foi possivel salvar os backup codes."
    );
  }
}

export async function GET() {
  try {
    const ctx = await getAuthenticatedContext();

    return NextResponse.json({
      ok: true,
      factorActive: Boolean(ctx.totpFactor),
      currentLevel: ctx.currentLevel,
      backupCodesRemaining: getRemainingBackupCodeCount(ctx.mfaMetadata),
      backupCodesLockedUntil: ctx.mfaMetadata?.locked_until || null,
      backupCodesGeneratedAt: ctx.mfaMetadata?.backup_codes_generated_at || null,
      backupCodesLastUsedAt: ctx.mfaMetadata?.backup_codes_last_used_at || null,
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
              "Confirme o autenticador nesta sessao antes de gerar novos backup codes.",
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
              "Confirme o autenticador nesta sessao antes de desativar a protecao.",
          },
          { status: 403 }
        );
      }

      const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.mfa.deleteFactor(
        {
          id: ctx.totpFactor.id,
          userId: ctx.authUser.id,
        }
      );

      if (deleteError) {
        return NextResponse.json(
          {
            ok: false,
            error:
              deleteError.message ||
              "Nao foi possivel desativar o autenticador.",
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
