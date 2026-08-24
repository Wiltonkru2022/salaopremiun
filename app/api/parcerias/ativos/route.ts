import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function hashScore(seed: string, id: string) {
  const hex = createHash("sha256").update(`${seed}:${id}`).digest("hex").slice(0, 12);
  return parseInt(hex, 16) / 0xffffffffffff;
}

function campaignLabel(origem: string, categoria?: string | null) {
  if (origem !== "salao_premium") return "Publicidade • Parceiro Salão Premium";
  if (categoria === "critico") return "Comunicado importante • Salão Premium";
  if (categoria === "beneficio") return "Benefício Salão Premium";
  if (categoria === "comunicado") return "Comunicado • Salão Premium";
  return "Novidade Salão Premium";
}

function asCampaign(campanha: any) {
  const parceiro = Array.isArray(campanha.parceiros_comerciais)
    ? campanha.parceiros_comerciais[0]
    : campanha.parceiros_comerciais;
  const criativos = (campanha.parceria_criativos || [])
    .filter((item: any) => item.ativo !== false)
    .sort((a: any, b: any) => Number(a.ordem || 0) - Number(b.ordem || 0));
  const criativo = criativos[0] || null;
  const origem = campanha.origem || "parceiro";
  const categoria = campanha.categoria_interna || null;

  return {
    id: campanha.id,
    origem,
    categoria,
    label: campaignLabel(origem, categoria),
    parceiro: origem === "salao_premium" ? "Salão Premium" : (parceiro?.nome_fantasia || parceiro?.razao_social || "Parceiro Salão Premium"),
    titulo: criativo?.titulo || campanha.nome,
    subtitulo: criativo?.subtitulo || campanha.descricao || null,
    imagemUrl: criativo?.imagem_url || null,
    altText: criativo?.alt_text || campanha.nome,
    ctaTexto: criativo?.cta_texto || (origem === "salao_premium" ? "Saiba mais" : "Conhecer parceiro"),
    destinoUrl: criativo?.destino_url || campanha.destino_url || null,
    cupomCodigo: campanha.cupom_codigo || null,
    prioridade: Number(campanha.prioridade || 0),
    pesoRotacao: Number(campanha.peso_rotacao || 1),
    limiteFrequenciaDia: Number(campanha.limite_frequencia_dia || 2),
    exclusiva: Boolean(campanha.exclusiva),
  };
}

export async function GET(request: NextRequest) {
  const idSalao = request.nextUrl.searchParams.get("idSalao");
  const publico = request.nextUrl.searchParams.get("publico") || "salao";
  const local = request.nextUrl.searchParams.get("local") || "dashboard";
  const modo = request.nextUrl.searchParams.get("modo") || "slot";
  const seed = request.nextUrl.searchParams.get("seed") || new Date().toISOString().slice(0, 13);
  const excluded = new Set(
    String(request.nextUrl.searchParams.get("exclude") || "")
      .split(",")
      .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
  );

  if (idSalao && !/^[0-9a-f-]{36}$/i.test(idSalao)) {
    return NextResponse.json({ campanha: null, campanhas: [] }, { status: 200 });
  }

  const supabase = getSupabaseAdmin() as any;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const [{ data: salao }, { data: campanhas }] = await Promise.all([
    idSalao
      ? supabase.from("saloes").select("cidade,estado").eq("id", idSalao).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("parceria_campanhas")
      .select("id,nome,descricao,destino_url,cupom_codigo,publico,locais_exibicao,regioes,inicio_em,fim_em,status,prioridade,peso_rotacao,limite_frequencia_dia,limite_impressoes_dia,exclusiva,origem,categoria_interna,parceiros_comerciais(nome_fantasia,razao_social),parceria_criativos(id,titulo,subtitulo,imagem_url,alt_text,cta_texto,destino_url,formato,ordem,ativo)")
      .in("status", ["ativa", "agendada"])
      .lte("inicio_em", now)
      .or(`fim_em.is.null,fim_em.gte.${now}`)
      .order("prioridade", { ascending: false })
      .limit(80),
  ]);

  const cidadeSalao = normalize(salao?.cidade);
  const estadoSalao = normalize(salao?.estado);

  let elegiveis = (campanhas || []).filter((campanha: any) => {
    const publicoOk = Array.isArray(campanha.publico) && campanha.publico.includes(publico);
    const localOk = Array.isArray(campanha.locais_exibicao) && campanha.locais_exibicao.includes(local);
    if (!publicoOk || !localOk) return false;

    const regioes = campanha.regioes || {};
    const cidadeAlvo = normalize(regioes.cidade);
    const ufAlvo = normalize(regioes.uf);
    if (!idSalao) return !cidadeAlvo && !ufAlvo;
    return (!cidadeAlvo || cidadeAlvo === cidadeSalao) && (!ufAlvo || ufAlvo === estadoSalao);
  });

  if (!elegiveis.length) return NextResponse.json({ campanha: null, campanhas: [] });

  const ids = elegiveis.map((c: any) => c.id);
  const { data: metricas } = await supabase
    .from("parceria_metricas_diarias")
    .select("id_campanha,impressoes")
    .in("id_campanha", ids)
    .eq("data", today)
    .eq("local_exibicao", local);

  const impressoesHoje = new Map<string, number>();
  for (const row of metricas || []) impressoesHoje.set(String(row.id_campanha), Number(row.impressoes || 0));

  elegiveis = elegiveis.filter((campanha: any) => {
    const limite = campanha.limite_impressoes_dia == null ? null : Number(campanha.limite_impressoes_dia);
    return limite == null || (impressoesHoje.get(campanha.id) || 0) < limite;
  });

  if (modo === "lista") {
    return NextResponse.json({
      campanhas: elegiveis
        .sort((a: any, b: any) => {
          const aCritico = a.origem === "salao_premium" && a.categoria_interna === "critico" ? 1 : 0;
          const bCritico = b.origem === "salao_premium" && b.categoria_interna === "critico" ? 1 : 0;
          if (aCritico !== bCritico) return bCritico - aCritico;
          return Number(b.prioridade || 0) - Number(a.prioridade || 0);
        })
        .slice(0, 50)
        .map(asCampaign),
    });
  }

  const semBloqueadas = elegiveis.filter((c: any) => !excluded.has(c.id));
  if (semBloqueadas.length) elegiveis = semBloqueadas;
  else if (excluded.size) return NextResponse.json({ campanha: null });

  const criticas = elegiveis.filter((c: any) => c.origem === "salao_premium" && c.categoria_interna === "critico");
  if (criticas.length) {
    elegiveis = criticas;
  } else {
    const exclusivas = elegiveis.filter((c: any) => c.exclusiva);
    if (exclusivas.length) elegiveis = exclusivas;
  }

  const maiorPrioridade = Math.max(...elegiveis.map((c: any) => Number(c.prioridade || 0)));
  const faixa = elegiveis.filter((c: any) => Number(c.prioridade || 0) === maiorPrioridade);

  faixa.sort((a: any, b: any) => {
    const aPeso = Math.max(1, Number(a.peso_rotacao || 1));
    const bPeso = Math.max(1, Number(b.peso_rotacao || 1));
    const aCarga = (impressoesHoje.get(a.id) || 0) / aPeso;
    const bCarga = (impressoesHoje.get(b.id) || 0) / bPeso;
    if (aCarga !== bCarga) return aCarga - bCarga;
    return hashScore(seed, a.id) - hashScore(seed, b.id);
  });

  return NextResponse.json({ campanha: asCampaign(faixa[0]) });
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
