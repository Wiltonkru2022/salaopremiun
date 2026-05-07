import { NextResponse } from "next/server";
import { htmlEscape, sendResendEmail } from "@/lib/email/resend";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildPasswordChangedEmailHtml(params: {
  email: string;
  occurredAt: Date;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(params.occurredAt);

  const rawBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_MAIN_HOST ||
    "https://salaopremiun.com.br";
  const baseUrl = rawBaseUrl.startsWith("http")
    ? rawBaseUrl.replace(/\/$/, "")
    : `https://${rawBaseUrl.replace(/\/$/, "")}`;
  const okUrl = `${baseUrl}/login`;
  const recoveryUrl = `${baseUrl}/recuperar-senha?email=${encodeURIComponent(params.email)}`;

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden">
        <div style="padding:30px">
          <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#64748b">Seguranca SalaoPremium</p>
          <h1 style="margin:0;font-size:28px;line-height:1.15;color:#0f172a">Sua senha foi alterada</h1>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.7;color:#475569">
            A senha do painel SalaoPremium da conta ${htmlEscape(params.email)} foi alterada em ${htmlEscape(formattedDate)}.
          </p>
          <p style="margin:14px 0 0;font-size:13px;line-height:1.7;color:#64748b">
            IP: ${htmlEscape(params.ip || "nao identificado")}<br />
            Navegador/dispositivo: ${htmlEscape(params.userAgent || "nao identificado")}
          </p>
          <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#64748b">
            Se foi voce, confirme abaixo. Se nao foi voce, solicite imediatamente uma nova recuperacao de senha e fale com o suporte.
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

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return NextResponse.json({ message: "Sessao nao informada." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase.auth.getUser(token);
  const email = String(data?.user?.email || "").trim().toLowerCase();

  if (error || !email) {
    return NextResponse.json({ message: "Sessao invalida." }, { status: 401 });
  }

  const occurredAt = new Date();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent") || null;

  await sendResendEmail({
    from:
      process.env.PASSWORD_RECOVERY_EMAIL_FROM ||
      "SalaoPremium <recuperar@salaopremiun.com.br>",
    to: email,
    subject: "Sua senha foi alterada - SalaoPremium",
    html: buildPasswordChangedEmailHtml({
      email,
      occurredAt,
      ip,
      userAgent,
    }),
    text: `Sua senha do painel SalaoPremium foi alterada em ${occurredAt.toLocaleString("pt-BR")}. IP: ${ip || "nao identificado"}. Navegador/dispositivo: ${userAgent || "nao identificado"}. Se nao foi voce, solicite uma nova recuperacao e fale com o suporte.`,
    replyTo: process.env.PASSWORD_RECOVERY_EMAIL_REPLY_TO || undefined,
  });

  return NextResponse.json({ ok: true });
}
