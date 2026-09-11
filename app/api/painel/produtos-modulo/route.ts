import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
  const { user, usuario } = await getPainelUserContext();
  if (!user || !usuario?.id_salao) {
    return NextResponse.json({ error: "Sessao expirada." }, { status: 401 });
  }
  if (String(usuario.nivel || "").toLowerCase() !== "admin") {
    return NextResponse.json(
      { error: "Somente o administrador do salao pode ativar Produtos e Estoque." },
      { status: 403 }
    );
  }

  const admin = getSupabaseAdmin() as any;
  const { data: salao, error: loadError } = await admin
    .from("saloes")
    .select("onboarding_concluido")
    .eq("id", usuario.id_salao)
    .maybeSingle();
  if (loadError || !salao) {
    return NextResponse.json(
      { error: loadError?.message || "Salao nao encontrado." },
      { status: 503 }
    );
  }
  if (salao.onboarding_concluido !== true) {
    return NextResponse.json(
      { error: "Finalize a configuracao inicial antes de ativar esta funcionalidade." },
      { status: 423 }
    );
  }

  const { error } = await admin
    .from("saloes")
    .update({ produtos_modulo_ativo: true, updated_at: new Date().toISOString() })
    .eq("id", usuario.id_salao);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/produtos");
  revalidatePath("/estoque");
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}
