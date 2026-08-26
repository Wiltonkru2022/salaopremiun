import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { loadPainelShellNotificationsCached } from "@/lib/painel/load-painel-shell-data";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import { getDatabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, usuario } = await getPainelUserContext();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  if (!usuario?.id_salao || usuario.status !== "ativo") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const admin = getDatabaseAdmin();
  const { data: assinatura } = await admin
    .from("assinaturas")
    .select("status, vencimento_em, trial_fim_em")
    .eq("id_salao", usuario.id_salao)
    .limit(1)
    .maybeSingle();

  const resumoAssinatura = assinatura?.status
    ? getResumoAssinatura({
        status: assinatura.status,
        vencimentoEm: assinatura.vencimento_em,
        trialFimEm: assinatura.trial_fim_em,
      })
    : null;

  const notifications = await loadPainelShellNotificationsCached(
    usuario.id_salao,
    resumoAssinatura
  );

  return NextResponse.json(
    { notifications },
    { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=15" } }
  );
}
