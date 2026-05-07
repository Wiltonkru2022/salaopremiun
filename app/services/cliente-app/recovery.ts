import crypto from "crypto";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { hashClientePassword } from "@/lib/cliente-auth.server";
import { htmlEscape, sendResendEmail } from "@/lib/email/resend";

type RecoverClienteAppAccessParams = {
  email: string;
  telefone: string;
  senha: string;
  confirmacao: string;
};

type RecoverClienteAppAccessResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

type RequestClienteAppRecoveryResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

type ResetClienteAppPasswordParams = {
  token: string;
  senha: string;
  confirmacao: string;
};

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value: string) {
  return String(value || "").replace(/\D/g, "").trim();
}

function base64urlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getClienteRecoverySecret() {
  const secret =
    process.env.CLIENT_APP_RECOVERY_SECRET || process.env.PASSWORD_REUSE_SECRET;

  if (!secret) {
    throw new Error("CLIENT_APP_RECOVERY_SECRET ou PASSWORD_REUSE_SECRET nao configurado.");
  }

  return secret;
}

function signTokenPayload(payload: string) {
  return crypto
    .createHmac("sha256", getClienteRecoverySecret())
    .update(payload)
    .digest("base64url");
}

function createClienteRecoveryToken(email: string) {
  const payload = base64urlEncode(
    JSON.stringify({
      email,
      exp: Date.now() + 1000 * 60 * 30,
    })
  );
  const signature = signTokenPayload(payload);

  return `${payload}.${signature}`;
}

function parseClienteRecoveryToken(token: string) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;

  const expectedSignature = signTokenPayload(payload);
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64urlDecode(payload)) as {
      email?: string;
      exp?: number;
    };

    if (!parsed.email || !parsed.exp || parsed.exp < Date.now()) return null;

    return {
      email: normalizeEmail(parsed.email),
    };
  } catch {
    return null;
  }
}

function getClientAppBaseUrl() {
  const root =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_MAIN_HOST ||
    "https://salaopremiun.com.br";

  if (root.startsWith("http")) return root.replace(/\/$/, "");

  return `https://${root.replace(/\/$/, "")}`;
}

function buildClienteRecoveryEmailHtml(params: { link: string; email: string }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden">
        <div style="padding:30px 30px 12px">
          <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#64748b">App cliente SalaoPremium</p>
          <h1 style="margin:0;font-size:30px;line-height:1.15;color:#0f172a">Recuperar acesso</h1>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.7;color:#475569">
            Use o link abaixo para criar uma nova senha da conta ${htmlEscape(params.email)}.
          </p>
          <a href="${htmlEscape(params.link)}" style="display:inline-block;margin-top:24px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 20px;font-size:14px;font-weight:800">Criar nova senha</a>
        </div>
        <div style="padding:20px 30px 30px">
          <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b">
            Se voce nao pediu esta recuperacao, ignore este e-mail. O link expira em 30 minutos.
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function requestClienteAppRecovery(
  emailInput: string
): Promise<RequestClienteAppRecoveryResult> {
  const email = normalizeEmail(emailInput);

  if (!email) {
    return { ok: false, error: "Informe o e-mail da conta." };
  }

  return runAdminOperation({
    action: "cliente_app_request_recovery",
    actorId: email,
    run: async (supabaseAdmin) => {
      const { data: conta, error } = await (supabaseAdmin as any)
        .from("clientes_app_auth")
        .select("id, email, ativo")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (error) {
        return {
          ok: false as const,
          error: "Nao foi possivel iniciar a recuperacao agora.",
        };
      }

      if (conta?.id && conta.ativo !== false) {
        const token = createClienteRecoveryToken(email);
        const link = `${getClientAppBaseUrl()}/app-cliente/recuperar-acesso/${encodeURIComponent(token)}`;

        await sendResendEmail({
          from:
            process.env.PASSWORD_RECOVERY_EMAIL_FROM ||
            "SalaoPremium <recuperar@salaopremiun.com.br>",
          to: email,
          subject: "Recuperar acesso do app cliente - SalaoPremium",
          html: buildClienteRecoveryEmailHtml({ link, email }),
          text: `Use este link para criar uma nova senha no app cliente: ${link}`,
          replyTo: process.env.PASSWORD_RECOVERY_EMAIL_REPLY_TO || undefined,
        });
      }

      return {
        ok: true as const,
        message:
          "Se esse e-mail existir no app cliente, enviaremos um link de recuperacao.",
      };
    },
  });
}

export async function resetClienteAppPasswordWithToken(
  params: ResetClienteAppPasswordParams
): Promise<RecoverClienteAppAccessResult> {
  const token = parseClienteRecoveryToken(params.token);
  const senha = String(params.senha || "").trim();
  const confirmacao = String(params.confirmacao || "").trim();

  if (!token) {
    return {
      ok: false,
      error: "Link de recuperacao invalido ou expirado. Solicite um novo link.",
    };
  }

  if (senha.length < 6) {
    return { ok: false, error: "A nova senha precisa ter pelo menos 6 caracteres." };
  }

  if (senha !== confirmacao) {
    return { ok: false, error: "A confirmacao da senha nao confere." };
  }

  return runAdminOperation({
    action: "cliente_app_reset_password_with_token",
    actorId: token.email,
    run: async (supabaseAdmin) => {
      const { data: conta, error } = await (supabaseAdmin as any)
        .from("clientes_app_auth")
        .select("id, ativo")
        .eq("email", token.email)
        .limit(1)
        .maybeSingle();

      if (error || !conta?.id || conta.ativo === false) {
        return {
          ok: false as const,
          error: "Nao encontramos uma conta global ativa para este link.",
        };
      }

      const senhaHash = await hashClientePassword(senha);
      const [updateContaResult, vinculosResult] = await Promise.all([
        (supabaseAdmin as any)
          .from("clientes_app_auth")
          .update({
            senha_hash: senhaHash,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conta.id),
        supabaseAdmin
          .from("clientes_auth")
          .select("id")
          .eq("app_conta_id", conta.id),
      ]);

      if (updateContaResult.error || vinculosResult.error) {
        return {
          ok: false as const,
          error: "Nao foi possivel atualizar sua senha agora.",
        };
      }

      if (vinculosResult.data?.length) {
        await supabaseAdmin
          .from("clientes_auth")
          .update({
            senha_hash: senhaHash,
            updated_at: new Date().toISOString(),
          })
          .eq("app_conta_id", conta.id);
      }

      return {
        ok: true as const,
        message:
          "Senha atualizada com sucesso. Agora voce ja pode voltar ao login.",
      };
    },
  });
}

export async function recoverClienteAppAccess(
  params: RecoverClienteAppAccessParams
): Promise<RecoverClienteAppAccessResult> {
  const email = normalizeEmail(params.email);
  const telefone = normalizePhone(params.telefone);
  const senha = String(params.senha || "").trim();
  const confirmacao = String(params.confirmacao || "").trim();

  if (!email) {
    return { ok: false, error: "Informe o e-mail da conta." };
  }

  if (!telefone) {
    return { ok: false, error: "Informe o telefone cadastrado da conta." };
  }

  if (senha.length < 6) {
    return { ok: false, error: "A nova senha precisa ter pelo menos 6 caracteres." };
  }

  if (senha !== confirmacao) {
    return { ok: false, error: "A confirmacao da senha nao confere." };
  }

  return runAdminOperation({
    action: "cliente_app_recover_access",
    actorId: email,
    run: async (supabaseAdmin) => {
      const { data: conta, error } = await (supabaseAdmin as any)
        .from("clientes_app_auth")
        .select("id, telefone, ativo")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (error || !conta?.id || conta.ativo === false) {
        return {
          ok: false as const,
          error: "Nao encontramos uma conta global ativa com esse e-mail.",
        };
      }

      const telefoneConta = normalizePhone(String(conta.telefone || ""));
      if (!telefoneConta || telefoneConta !== telefone) {
        return {
          ok: false as const,
          error: "O telefone informado nao confere com a conta global.",
        };
      }

      const senhaHash = await hashClientePassword(senha);

      const [updateContaResult, vinculosResult] = await Promise.all([
        (supabaseAdmin as any)
          .from("clientes_app_auth")
          .update({
            senha_hash: senhaHash,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conta.id),
        supabaseAdmin
          .from("clientes_auth")
          .select("id")
          .eq("app_conta_id", conta.id),
      ]);

      if (updateContaResult.error || vinculosResult.error) {
        return {
          ok: false as const,
          error: "Nao foi possivel atualizar sua senha agora.",
        };
      }

      if (vinculosResult.data?.length) {
        await supabaseAdmin
          .from("clientes_auth")
          .update({
            senha_hash: senhaHash,
            updated_at: new Date().toISOString(),
          })
          .eq("app_conta_id", conta.id);
      }

      return {
        ok: true as const,
        message:
          "Senha atualizada com sucesso. Agora voce ja pode voltar ao login.",
      };
    },
  });
}
