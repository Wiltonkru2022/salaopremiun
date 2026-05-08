import { NextResponse } from "next/server";
import { getPublicAuthUrl } from "@/lib/auth/public-auth-url";
import { htmlEscape, sendResendEmail } from "@/lib/email/resend";
import {
  assertPublicRateLimit,
  getPublicRateLimitIdentity,
} from "@/lib/security/public-rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const publicRoute = "rota publica: recuperacao de senha com rate limit por IP.";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getRequestHost(request: Request) {
  return (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    null
  );
}

function buildRecoveryEmailHtml(params: { link: string; email: string }) {
  const link = htmlEscape(params.link);
  const email = htmlEscape(params.email);

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden">
        <div style="padding:30px 30px 12px">
          <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#64748b">SalaoPremium</p>
          <h1 style="margin:0;font-size:30px;line-height:1.15;color:#0f172a">Recuperar acesso</h1>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.7;color:#475569">
            Recebemos uma solicitacao para redefinir a senha da conta ${email}.
          </p>
          <a href="${link}" style="display:inline-block;margin-top:24px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 20px;font-size:14px;font-weight:800">Criar nova senha</a>
        </div>
        <div style="padding:20px 30px 30px">
          <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b">
            Se voce nao solicitou essa recuperacao, ignore este e-mail. Por seguranca, o link expira automaticamente.
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email || "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { message: "Informe um e-mail valido." },
      { status: 400 }
    );
  }

  try {
    assertPublicRateLimit({
      key: getPublicRateLimitIdentity(request, `password-recovery:${email}`),
      limit: 3,
      windowMs: 15 * 60 * 1000,
    });

    const supabase = getSupabaseAdmin();
    const redirectTo = getPublicAuthUrl(
      "/atualizar-senha",
      getRequestHost(request)
    );

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo,
      },
    });

    if (error) {
      const message = String(error.message || "").toLowerCase();
      if (message.includes("not found") || message.includes("user")) {
        return NextResponse.json({ ok: true });
      }

      throw error;
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      throw new Error("Link de recuperacao nao foi gerado.");
    }

    await sendResendEmail({
      from:
        process.env.PASSWORD_RECOVERY_EMAIL_FROM ||
        "SalaoPremium <recuperar@salaopremiun.com.br>",
      to: email,
      subject: "Recuperar senha - SalaoPremium",
      html: buildRecoveryEmailHtml({ link: actionLink, email }),
      text: `Use este link para criar uma nova senha: ${actionLink}`,
      replyTo: process.env.PASSWORD_RECOVERY_EMAIL_REPLY_TO || undefined,
      idempotencyKey: `password-recovery-${email}-${Date.now()}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PASSWORD_RECOVERY_EMAIL_ERROR]", {
      error: error instanceof Error ? error.message : "erro_desconhecido",
    });

    return NextResponse.json(
      { message: "Nao foi possivel enviar o link de recuperacao." },
      { status: 500 }
    );
  }
}
