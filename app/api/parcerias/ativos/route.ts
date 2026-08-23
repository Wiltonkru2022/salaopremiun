import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  const idSalao = request.nextUrl.searchParams.get("idSalao");
  const publico = request.nextUrl.searchParams.get("publico") || "salao";
  const local = request.nextUrl.searchParams.get("local") || "dashboard";

  if (!idSalao || !/^[0-9a-f-]{36}$/i.test(idSalao)) {
    return NextResponse.json({ campanha: null }, { status: 200 });
  }

  const supabase = getSupabaseAdmin() as any;
  const [{ data: salao }, { data: campanhas }] = await Promise.all([
    supabase.from("saloes").select("cidade,estado").eq("id", idSalao).maybeSingle(),
    supabase
      .from("parceria_campanhas")
      .select("id,nome,descricao,destino_url,cupom_codigo,publico,locais_exibicao,regioes,inicio_em,fim_em,status,parceiros_comerciais(nome_fantasia,razao_social),parceria_criativos(id,titulo,subtitulo,imagem_url,alt_text,cta_texto,destino_url,formato,ordem,ativo)")
      .in("status", ["ativa", "agendada"])
      .lte("inicio_em", new Date().toISOString())
      .or(`fim_em.is.null,fim_em.gte.${new Date().toISOString()}`)
      .order("criado_em", { ascending: false })
      .limit(20),
  ]);

  const cidadeSalao = normalize(salao?.cidade);
  const estadoSalao = normalize(salao?.estado);

  const elegivel = (campanhas || []).find((campanha: any) => {
    const publicoOk = Array.isArray(campanha.publico) && campanha.publico.includes(publico);
    const localOk = Array.isArray(campanha.locais_exibicao) && campanha.locais_exibicao.includes(local);
    if (!publicoOk || !localOk) return false;

    const regioes = campanha.regioes || {};
    const cidadeAlvo = normalize(regioes.cidade);
    const ufAlvo = normalize(regioes.uf);
    const cidadeOk = !cidadeAlvo || cidadeAlvo === cidadeSalao;
    const ufOk = !ufAlvo || ufAlvo === estadoSalao;
    return cidadeOk && ufOk;
  });

  if (!elegivel) return NextResponse.json({ campanha: null });

  const parceiro = Array.isArray(elegivel.parceiros_comerciais)
    ? elegivel.parceiros_comerciais[0]
    : elegivel.parceiros_comerciais;
  const criativos = (elegivel.parceria_criativos || [])
    .filter((item: any) => item.ativo !== false)
    .sort((a: any, b: any) => Number(a.ordem || 0) - Number(b.ordem || 0));
  const criativo = criativos[0] || null;

  return NextResponse.json({
    campanha: {
      id: elegivel.id,
      parceiro: parceiro?.nome_fantasia || parceiro?.razao_social || "Parceiro Salão Premium",
      titulo: criativo?.titulo || elegivel.nome,
      subtitulo: criativo?.subtitulo || elegivel.descricao || null,
      imagemUrl: criativo?.imagem_url || null,
      altText: criativo?.alt_text || elegivel.nome,
      ctaTexto: criativo?.cta_texto || "Conhecer parceiro",
      destinoUrl: criativo?.destino_url || elegivel.destino_url || null,
      cupomCodigo: elegivel.cupom_codigo || null,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idCampanha = String(body?.idCampanha || "");
    const local = String(body?.local || "dashboard");
    const tipo = String(body?.tipo || "");
    if (!/^[0-9a-f-]{36}$/i.test(idCampanha) || !["impressao", "clique", "conversao", "cupom"].includes(tipo)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = getSupabaseAdmin() as any;
    const { error } = await supabase.rpc("registrar_parceria_metrica", {
      p_id_campanha: idCampanha,
      p_local_exibicao: local.slice(0, 60),
      p_tipo: tipo,
    });
    if (error) return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
