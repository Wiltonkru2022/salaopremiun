import { NextResponse } from "next/server";
import { requireAdminTenantActor } from "@/lib/auth/tenant-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const AUTOMATION_KEYS = [
  "confirmacao_agendamento",
  "lembrete_agendamento",
  "agendamento_alterado",
  "agendamento_cancelado",
  "profissional_confirmado",
  "pagamento_confirmado",
] as const;

type AutomationKey = (typeof AUTOMATION_KEYS)[number];
type AutomationPreferences = Record<AutomationKey, boolean>;

const AUTOMATION_SELECT =
  "confirmacao_agendamento, lembrete_agendamento, agendamento_alterado, agendamento_cancelado, profissional_confirmado, pagamento_confirmado";

const DEFAULTS: AutomationPreferences = {
  confirmacao_agendamento: true,
  lembrete_agendamento: true,
  agendamento_alterado: true,
  agendamento_cancelado: true,
  profissional_confirmado: true,
  pagamento_confirmado: true,
};

function normalize(row?: Record<string, unknown> | null): AutomationPreferences {
  return {
    confirmacao_agendamento: row?.confirmacao_agendamento !== false,
    lembrete_agendamento: row?.lembrete_agendamento !== false,
    agendamento_alterado: row?.agendamento_alterado !== false,
    agendamento_cancelado: row?.agendamento_cancelado !== false,
    profissional_confirmado: row?.profissional_confirmado !== false,
    pagamento_confirmado: row?.pagamento_confirmado !== false,
  };
}

async function loadPreferences(idSalao: string) {
  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from("whatsapp_automacoes_saloes")
    .select(AUTOMATION_SELECT)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) throw error;
  if (data) return normalize(data as Record<string, unknown>);

  const { data: created, error: createError } = await supabase
    .from("whatsapp_automacoes_saloes")
    .upsert({ id_salao: idSalao, ...DEFAULTS }, { onConflict: "id_salao" })
    .select(AUTOMATION_SELECT)
    .single();

  if (createError) throw createError;
  return normalize(created as Record<string, unknown>);
}

export async function GET() {
  try {
    const actor = await requireAdminTenantActor();
    const preferences = await loadPreferences(actor.idSalao);
    return NextResponse.json({ ok: true, preferences });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar as mensagens automaticas.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireAdminTenantActor();
    const body = (await request.json().catch(() => null)) as
      | { key?: string; enabled?: boolean }
      | null;
    const key = String(body?.key || "") as AutomationKey;

    if (!AUTOMATION_KEYS.includes(key) || typeof body?.enabled !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "Configuracao de mensagem automatica invalida." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin() as any;
    const current = await loadPreferences(actor.idSalao);
    const next = { ...current, [key]: body.enabled };

    const { data, error } = await supabase
      .from("whatsapp_automacoes_saloes")
      .upsert(
        {
          id_salao: actor.idSalao,
          ...next,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "id_salao" }
      )
      .select(AUTOMATION_SELECT)
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      preferences: normalize(data as Record<string, unknown>),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel atualizar a mensagem automatica.",
      },
      { status: 500 }
    );
  }
}
