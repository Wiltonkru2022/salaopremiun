import { htmlEscape, sendResendEmail } from "@/lib/email/resend";

type WelcomeEmailParams = {
  idSalao: string;
  nomeSalao: string;
  responsavel: string;
  email: string;
  ip: string;
  userAgent: string;
  trialFimEm?: string | null;
  loginUrl: string;
  recoveryUrl: string;
};

function formatDate(value?: string | null) {
  if (!value) return "15 dias a partir da criação da conta";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "15 dias a partir da criação da conta";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function summarizeDevice(userAgent: string) {
  const value = userAgent || "Não informado";
  const browser = /edg/i.test(value)
    ? "Microsoft Edge"
    : /chrome|crios/i.test(value)
      ? "Google Chrome"
      : /firefox|fxios/i.test(value)
        ? "Mozilla Firefox"
        : /safari/i.test(value)
          ? "Safari"
          : "Navegador não identificado";
  const system = /windows/i.test(value)
    ? "Windows"
    : /android/i.test(value)
      ? "Android"
      : /iphone|ipad|ios/i.test(value)
        ? "iOS"
        : /mac os|macintosh/i.test(value)
          ? "macOS"
          : /linux/i.test(value)
            ? "Linux"
            : "Sistema não identificado";

  return `${browser} em ${system}`;
}

function buildWelcomeEmailHtml(params: WelcomeEmailParams) {
  const nomeSalao = htmlEscape(params.nomeSalao);
  const responsavel = htmlEscape(params.responsavel);
  const email = htmlEscape(params.email);
  const ip = htmlEscape(params.ip || "Não informado");
  const device = htmlEscape(summarizeDevice(params.userAgent));
  const loginUrl = htmlEscape(params.loginUrl);
  const recoveryUrl = htmlEscape(params.recoveryUrl);
  const trialFim = htmlEscape(formatDate(params.trialFimEm));

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden">
        <div style="background:#0f172a;padding:28px 30px;color:#ffffff">
          <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#facc15">SalãoPremium</p>
          <h1 style="margin:0;font-size:30px;line-height:1.18">Bem-vindo ao SalãoPremium.</h1>
          <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#e2e8f0">
            Seu ambiente foi criado com teste grátis de 15 dias e todos os recursos liberados.
          </p>
        </div>

        <div style="padding:28px 30px">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#334155">
            Olá, ${responsavel}. O cadastro do salão <strong>${nomeSalao}</strong> foi concluído com sucesso.
          </p>

          <div style="border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
            <div style="padding:16px 18px;border-bottom:1px solid #e2e8f0;background:#f8fafc">
              <strong style="display:block;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.12em">Dados de acesso</strong>
            </div>
            <div style="padding:16px 18px">
              <p style="margin:0 0 10px;font-size:15px;color:#334155"><strong>E-mail cadastrado:</strong> ${email}</p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b">
                Por segurança, sua senha não é exibida nem enviada por e-mail. Se precisar, use o botão de recuperação de acesso.
              </p>
            </div>
          </div>

          <div style="margin-top:18px;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
            <div style="padding:16px 18px;border-bottom:1px solid #e2e8f0;background:#f8fafc">
              <strong style="display:block;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.12em">Segurança do cadastro</strong>
            </div>
            <div style="padding:16px 18px">
              <p style="margin:0 0 10px;font-size:15px;color:#334155"><strong>IP do cadastro:</strong> ${ip}</p>
              <p style="margin:0;font-size:15px;color:#334155"><strong>Dispositivo detectado:</strong> ${device}</p>
            </div>
          </div>

          <div style="margin-top:18px;border:1px solid #fde68a;background:#fffbeb;border-radius:18px;padding:16px 18px">
            <p style="margin:0 0 8px;font-size:15px;font-weight:800;color:#92400e">Teste grátis ativo</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#92400e">
              Você tem 15 dias de teste grátis com agenda, caixa, clientes, profissionais, serviços, comandas, relatórios, app cliente e app profissional liberados.
              O teste fica disponível até ${trialFim}.
            </p>
          </div>

          <div style="margin-top:24px">
            <a href="${loginUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 20px;font-size:14px;font-weight:800">Acessar meu painel</a>
            <a href="${recoveryUrl}" style="display:inline-block;margin-left:10px;color:#0f172a;text-decoration:underline;font-size:14px;font-weight:800">Recuperar acesso</a>
          </div>

          <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#64748b">
            Se você não fez esse cadastro, responda este e-mail ou fale com o suporte imediatamente.
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function sendCadastroSalaoWelcomeEmail(params: WelcomeEmailParams) {
  await sendResendEmail({
    from:
      process.env.CADASTRO_SALAO_EMAIL_FROM ||
      "SalãoPremium <boasvindas@salaopremiun.com.br>",
    to: params.email,
    subject: "Bem-vindo ao SalãoPremium — seu teste grátis está ativo",
    html: buildWelcomeEmailHtml(params),
    text: [
      `Olá, ${params.responsavel}.`,
      `Seu salão ${params.nomeSalao} foi cadastrado com sucesso.`,
      `E-mail cadastrado: ${params.email}.`,
      "Por segurança, sua senha não é enviada por e-mail.",
      `IP do cadastro: ${params.ip || "Não informado"}.`,
      `Dispositivo detectado: ${summarizeDevice(params.userAgent)}.`,
      `Teste grátis de 15 dias liberado até ${formatDate(params.trialFimEm)}.`,
      `Acesse: ${params.loginUrl}`,
      `Recuperar acesso: ${params.recoveryUrl}`,
    ].join("\n"),
    replyTo:
      process.env.CADASTRO_SALAO_EMAIL_REPLY_TO ||
      process.env.PASSWORD_RECOVERY_EMAIL_REPLY_TO ||
      undefined,
    idempotencyKey: `cadastro-salao-welcome-${params.idSalao}`,
  });
}
