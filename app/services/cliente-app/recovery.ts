import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { hashClientePassword } from "@/lib/cliente-auth.server";
import { htmlEscape, sendResendEmail } from "@/lib/email/resend";

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
  ip?: string | null;
  userAgent?: string | null;
};

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function hashRecoveryToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
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
            Se voce nao pediu esta recuperacao, ignore este e-mail. O link expira em 15 minutos e funciona somente uma vez.
          </p>
        </div>
      </div>
    </div>
  `;
}

function base64urlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getClienteRecoverySecret() {
  return (
    process.env.CLIENT_APP_RECOVERY_SECRET ||
    process.env.PASSWORD_REUSE_SECRET ||
    ""
  );
}

function signTokenPayload(payload: string) {
  const secret = getClienteRecoverySecret();
  if (!secret) {
    throw new Error("CLIENT_APP_RECOVERY_SECRET ausente.");
  }

  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function createClienteRecoveryToken(params: {
  email: string;
  passwordHash: string;
}) {
  const payload = base64urlEncode(
    JSON.stringify({
      email: params.email,
      pwd: hashRecoveryToken(params.passwordHash),
      exp: Date.now() + 1000 * 60 * 15,
    })
  );
  const signature = signTokenPayload(payload);

  return `${payload}.${signature}`;
}

function parseClienteRecoveryToken(token: string):
  | { email: string; passwordHashDigest: string }
  | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = signTokenPayload(payload);
  if (signature.length !== expectedSignature.length) return null;

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64urlDecode(payload)) as {
      email?: string;
      pwd?: string;
      exp?: number;
    };
    const email = normalizeEmail(parsed.email || "");
    const passwordHashDigest = String(parsed.pwd || "");
    const expiresAt = Number(parsed.exp || 0);

    if (!email || !passwordHashDigest || !expiresAt || expiresAt < Date.now()) {
      return null;
    }

    return { email, passwordHashDigest };
  } catch {
    return null;
  }
}

function buildPasswordChangedEmailHtml(params: {
  email: string;
  context: string;
  occurredAt: Date;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(params.occurredAt);

  const baseUrl = getClientAppBaseUrl();
  const okUrl = `${baseUrl}/app-cliente/login`;
  const recoveryUrl = `${baseUrl}/app-cliente/recuperar-acesso?email=${encodeURIComponent(params.email)}`;

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden">
        <div style="padding:30px 30px 12px">
          <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#64748b">Seguranca SalaoPremium</p>
          <h1 style="margin:0;font-size:28px;line-height:1.15;color:#0f172a">Sua senha foi alterada</h1>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.7;color:#475569">
            A senha de ${htmlEscape(params.context)} da conta ${htmlEscape(params.email)} foi alterada em ${htmlEscape(formattedDate)}.
          </p>
          <p style="margin:14px 0 0;font-size:13px;line-height:1.7;color:#64748b">
            IP: ${htmlEscape(params.ip || "nao identificado")}<br />
            Navegador/dispositivo: ${htmlEscape(params.userAgent || "nao identificado")}
          </p>
          <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#64748b">
            Se foi voce, confirme abaixo. Se nao foi voce, solicite imediatamente uma nova recuperacao de senha e avise o suporte.
          </p>
          <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
            <a href="${htmlEscape(okUrl)}" style="display:inline-block;background:#ecfdf5;color:#065f46;text-decoration:none;border-radius:999px;padding:12px 18px;font-size:14px;font-weight:800">Fui eu</a>
            <a href="${htmlEscape(recoveryUrl)}" style="display:inline-block;background:#fee2e2;color:#991b1b;text-decoration:none;border-radius:999px;padding:12px 18px;font-size:14px;font-weight:800">Nao fui eu</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function sendPasswordChangedNotice(params: {
  email?: string | null;
  context: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const email = normalizeEmail(params.email || "");
  if (!email) return;

  const occurredAt = new Date();

  await sendResendEmail({
    from:
      process.env.PASSWORD_RECOVERY_EMAIL_FROM ||
      "SalaoPremium <recuperar@salaopremiun.com.br>",
    to: email,
    subject: "Sua senha foi alterada - SalaoPremium",
    html: buildPasswordChangedEmailHtml({
      email,
      context: params.context,
      occurredAt,
      ip: params.ip,
      userAgent: params.userAgent,
    }),
    text: `Sua senha de ${params.context} foi alterada em ${occurredAt.toLocaleString("pt-BR")}. IP: ${params.ip || "nao identificado"}. Navegador/dispositivo: ${params.userAgent || "nao identificado"}. Se nao foi voce, solicite uma nova recuperacao e fale com o suporte.`,
    replyTo: process.env.PASSWORD_RECOVERY_EMAIL_REPLY_TO || undefined,
  });
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
        .select("id, email, senha_hash, ativo")
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
        const token = createClienteRecoveryToken({
          email,
          passwordHash: String(conta.senha_hash || ""),
        });
        const link = `${getClientAppBaseUrl()}/app-cliente/recuperar-acesso/${encodeURIComponent(token)}`;

        await sendResendEmail({
          from:
            process.env.PASSWORD_RECOVERY_EMAIL_FROM ||
            "SalaoPremium <recuperar@salaopremiun.com.br>",
          to: email,
          subject: "Recuperar acesso do app cliente - SalaoPremium",
          html: buildClienteRecoveryEmailHtml({ link, email }),
          text: `Use este link para criar uma nova senha no app cliente: ${link}. Ele expira em 15 minutos e funciona somente uma vez.`,
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
  const rawToken = String(params.token || "").trim();
  const senha = String(params.senha || "").trim();
  const confirmacao = String(params.confirmacao || "").trim();

  if (!rawToken) {
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
    actorId: "cliente_app_recovery_token",
    run: async (supabaseAdmin) => {
      const recoveryToken = parseClienteRecoveryToken(rawToken);

      if (!recoveryToken) {
        return {
          ok: false as const,
          error: "Link de recuperacao invalido ou expirado. Solicite um novo link.",
        };
      }

      const { data: conta, error } = await (supabaseAdmin as any)
        .from("clientes_app_auth")
        .select("id, email, senha_hash, ativo")
        .eq("email", recoveryToken.email)
        .limit(1)
        .maybeSingle();

      if (error || !conta?.id || conta.ativo === false) {
        return {
          ok: false as const,
          error: "Nao encontramos uma conta global ativa para este link.",
        };
      }

      const currentPasswordHashDigest = hashRecoveryToken(
        String(conta.senha_hash || "")
      );
      if (currentPasswordHashDigest !== recoveryToken.passwordHashDigest) {
        return {
          ok: false as const,
          error: "Este link ja foi usado. Solicite uma nova recuperacao.",
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

      revalidateTag("cliente-app-session", "max");
      await sendPasswordChangedNotice({
        email: conta.email,
        context: "App cliente",
        ip: params.ip,
        userAgent: params.userAgent,
      });

      return {
        ok: true as const,
        message:
          "Senha atualizada com sucesso. Agora voce ja pode voltar ao login.",
      };
    },
  });
}
