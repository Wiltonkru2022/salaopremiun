import { NextRequest, NextResponse } from "next/server";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Payload = {
  idSalao?: string | null;
};

export async function POST(req: NextRequest) {
  await requireAdminMasterUser("operacao_reprocessar");
  const body = (await req.json().catch(() => ({}))) as Payload;
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin.rpc(
    "fn_admin_master_avaliar_extensao_trial",
    {
      p_id_salao: body.idSalao || null,
    }
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, data });
}
