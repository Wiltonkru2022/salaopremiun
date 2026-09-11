import { NextResponse } from "next/server";
import { requireAdminTenantActor } from "@/lib/auth/tenant-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { expireWhatsappPixRecargas } from "@/lib/whatsapp-creditos/expire-pix";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAdminTenantActor();
    const supabase = getSupabaseAdmin() as any;

    // Ao completar 24 horas, o backend consulta o estado real no Asaas.
    // Se ainda estiver em aberto, remove a cobranca no provedor antes de
    // considera-la expirada no SalaoPremium.
    await expireWhatsappPixRecargas({ idSalao: actor.idSalao, limit: 5 });

    const [recargasResult, walletResult] = await Promise.all([
      supabase
        .from("whatsapp_creditos_recargas")
        .select(
          "id, status, valor_centavos, pago_em, creditado_em, erro_texto, criado_em, atualizado_em, expira_em"
        )
        .eq("id_salao", actor.idSalao)
        .in("status", ["pendente", "processando", "pago", "falhou"])
        .order("criado_em", { ascending: false })
        .limit(5),
      supabase
        .from("whatsapp_creditos_saloes")
        .select("saldo_centavos, ultima_recarga_em")
        .eq("id_salao", actor.idSalao)
        .maybeSingle(),
    ]);

    if (recargasResult.error) throw recargasResult.error;
    if (walletResult.error) throw walletResult.error;

    return NextResponse.json(
      {
        ok: true,
        saldoCentavos: Number(walletResult.data?.saldo_centavos || 0),
        ultimaRecargaEm: walletResult.data?.ultima_recarga_em || null,
        recargas: (recargasResult.data || []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          status: String(row.status || "pendente"),
          valorCentavos: Number(row.valor_centavos || 0),
          pagoEm: row.pago_em || null,
          creditadoEm: row.creditado_em || null,
          erro: row.erro_texto || null,
          criadoEm: row.criado_em,
          atualizadoEm: row.atualizado_em,
          expiraEm: row.expira_em || null,
        })),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel consultar o status da recarga.",
      },
      { status: 500 }
    );
  }
}
