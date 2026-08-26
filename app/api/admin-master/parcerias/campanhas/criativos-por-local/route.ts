import { NextRequest, NextResponse } from "next/server";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getDatabaseAdmin } from "@/lib/db/admin";
import {
  removeCampanhaImage,
  uploadCampanhaImage,
} from "@/services/campanhaMediaService";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PLACEMENTS = {
  app_cliente_menu: { formato: "banner", label: "App Cliente — Menu" },
  parceiros: { formato: "banner", label: "Parceiros e Benefícios" },
  app_cliente: { formato: "poster", label: "App Cliente — Popup" },
  dashboard: { formato: "poster", label: "Painel do Salão — Popup" },
  app_profissional: { formato: "card", label: "App Profissional" },
} as const;

type Placement = keyof typeof PLACEMENTS;

function isPlacement(value: string): value is Placement {
  return Object.prototype.hasOwnProperty.call(PLACEMENTS, value);
}

async function requireAccess() {
  const access = await getAdminMasterAccess("campanhas_editar");
  if (!access.ok) {
    return {
      response: NextResponse.json(
        { ok: false, error: access.message },
        { status: access.status }
      ),
      access: null,
    };
  }
  return { response: null, access };
}

export async function GET() {
  const auth = await requireAccess();
  if (!auth.access) return auth.response!;

  const database = getDatabaseAdmin() as any;
  const [{ data: campanhas, error: campanhasError }, { data: artes, error: artesError }] =
    await Promise.all([
      database
        .from("parceria_campanhas")
        .select("id,nome,status,origem,publico,locais_exibicao")
        .order("criado_em", { ascending: false })
        .limit(200),
      database
        .from("parceria_criativos_locais")
        .select(
          "id,id_campanha,local_exibicao,imagem_url,formato,ativo,criado_em,atualizado_em"
        )
        .eq("ativo", true)
        .order("atualizado_em", { ascending: false })
        .limit(1000),
    ]);

  if (campanhasError || artesError) {
    console.error("[admin-media-kit] load failed", {
      campanhasError,
      artesError,
    });
    return NextResponse.json(
      { ok: false, error: "Não foi possível carregar o kit de mídia." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    campanhas: campanhas || [],
    artes: artes || [],
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAccess();
  if (!auth.access) return auth.response!;

  try {
    const formData = await request.formData();
    const idCampanha = String(formData.get("id_campanha") || "").trim();
    const local = String(formData.get("local_exibicao") || "").trim();
    const arquivo = formData.get("imagem_arquivo");

    if (!UUID_PATTERN.test(idCampanha) || !isPlacement(local)) {
      return NextResponse.json(
        { ok: false, error: "Campanha ou posição de anúncio inválida." },
        { status: 400 }
      );
    }

    if (!(arquivo instanceof File) || arquivo.size <= 0) {
      return NextResponse.json(
        { ok: false, error: "Escolha uma imagem para esta posição." },
        { status: 400 }
      );
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
      return NextResponse.json(
        { ok: false, error: "Envie a arte em JPG, PNG ou WEBP." },
        { status: 400 }
      );
    }

    const database = getDatabaseAdmin() as any;
    const { data: campanha, error: campanhaError } = await database
      .from("parceria_campanhas")
      .select("id,nome")
      .eq("id", idCampanha)
      .maybeSingle();

    if (campanhaError || !campanha?.id) {
      return NextResponse.json(
        { ok: false, error: "Campanha não encontrada." },
        { status: 404 }
      );
    }

    const { data: anterior } = await database
      .from("parceria_criativos_locais")
      .select("id,imagem_url")
      .eq("id_campanha", idCampanha)
      .eq("local_exibicao", local)
      .maybeSingle();

    const uploadedUrl = await uploadCampanhaImage({
      idCampanha,
      file: arquivo,
    });

    const { data: salva, error: saveError } = await database
      .from("parceria_criativos_locais")
      .upsert(
        {
          id_campanha: idCampanha,
          local_exibicao: local,
          imagem_url: uploadedUrl,
          formato: PLACEMENTS[local].formato,
          ativo: true,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "id_campanha,local_exibicao" }
      )
      .select(
        "id,id_campanha,local_exibicao,imagem_url,formato,ativo,atualizado_em"
      )
      .single();

    if (saveError) {
      await removeCampanhaImage(uploadedUrl);
      console.error("[admin-media-kit] save failed", saveError);
      return NextResponse.json(
        { ok: false, error: "Não foi possível salvar a arte." },
        { status: 500 }
      );
    }

    if (anterior?.imagem_url && anterior.imagem_url !== uploadedUrl) {
      await removeCampanhaImage(anterior.imagem_url);
    }

    await registrarAdminMasterAuditoria({
      idAdmin: auth.access.usuario.id,
      acao: "atualizar_arte_campanha_local",
      entidade: "parceria_criativos_locais",
      entidadeId: salva?.id || null,
      descricao: `Arte de ${PLACEMENTS[local].label} atualizada na campanha ${campanha.nome}.`,
      payload: {
        id_campanha: idCampanha,
        local_exibicao: local,
        formato: PLACEMENTS[local].formato,
      },
    });

    return NextResponse.json({ ok: true, arte: salva });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar a arte.";
    console.error("[admin-media-kit] upload failed", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAccess();
  if (!auth.access) return auth.response!;

  try {
    const body = await request.json();
    const idCampanha = String(body?.idCampanha || "").trim();
    const local = String(body?.localExibicao || "").trim();

    if (!UUID_PATTERN.test(idCampanha) || !isPlacement(local)) {
      return NextResponse.json(
        { ok: false, error: "Campanha ou posição de anúncio inválida." },
        { status: 400 }
      );
    }

    const database = getDatabaseAdmin() as any;
    const { data: anterior, error: findError } = await database
      .from("parceria_criativos_locais")
      .select("id,imagem_url")
      .eq("id_campanha", idCampanha)
      .eq("local_exibicao", local)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { ok: false, error: "Não foi possível localizar a arte." },
        { status: 500 }
      );
    }

    if (!anterior?.id) {
      return NextResponse.json({ ok: true });
    }

    const { error: deleteError } = await database
      .from("parceria_criativos_locais")
      .delete()
      .eq("id", anterior.id);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: "Não foi possível remover a arte." },
        { status: 500 }
      );
    }

    await removeCampanhaImage(anterior.imagem_url);

    await registrarAdminMasterAuditoria({
      idAdmin: auth.access.usuario.id,
      acao: "remover_arte_campanha_local",
      entidade: "parceria_criativos_locais",
      entidadeId: anterior.id,
      descricao: `Arte de ${PLACEMENTS[local].label} removida.`,
      payload: {
        id_campanha: idCampanha,
        local_exibicao: local,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin-media-kit] delete failed", error);
    return NextResponse.json(
      { ok: false, error: "Não foi possível remover a arte." },
      { status: 500 }
    );
  }
}
