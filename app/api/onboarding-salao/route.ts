import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { createCadastroSalaoService } from "@/services/cadastroSalaoService";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] as const;
const ETAPAS = new Set(["perfil", "servicos", "profissionais", "produtos", "pix", "horarios", "revisao"]);

function text(value: unknown, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}
function numberValue(value: unknown, fallback = 0) {
  const valueNumber = Number(value);
  return Number.isFinite(valueNumber) ? valueNumber : fallback;
}
function idem(value: unknown) {
  return text(value, 100).replace(/[^a-zA-Z0-9:_-]/g, "");
}
function normalizeDays(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  const aliases: Record<string, string> = {
    segunda: "segunda", "segunda-feira": "segunda",
    terca: "terca", terça: "terca", "terca-feira": "terca", "terça-feira": "terca",
    quarta: "quarta", "quarta-feira": "quarta",
    quinta: "quinta", "quinta-feira": "quinta",
    sexta: "sexta", "sexta-feira": "sexta",
    sabado: "sabado", sábado: "sabado",
    domingo: "domingo",
  };
  return [...new Set(value.map((item) => aliases[text(item, 30).toLowerCase()]).filter(Boolean))];
}
function workDays(days: string[], start: string, end: string) {
  return DIAS.map((day) => ({ dia: day, inicio: start, fim: end, ativo: days.includes(day) }));
}

async function requireAdmin() {
  const { user, usuario } = await getPainelUserContext();
  if (!user || !usuario?.id_salao) {
    return { response: NextResponse.json({ error: "Sessão expirada." }, { status: 401 }) };
  }
  if (String(usuario.nivel || "").toLowerCase() !== "admin") {
    return { response: NextResponse.json({ error: "Somente o administrador pode concluir a configuração inicial." }, { status: 403 }) };
  }
  return { idSalao: String(usuario.id_salao), response: null };
}

async function loadState(idSalao: string) {
  const db = getDatabaseAdmin() as any;
  const [salaoR, configR, serviceR, proR, productR, linkR] = await Promise.all([
    db.from("saloes").select("id,nome,whatsapp,telefone,descricao_publica,instagram_url,logo_url,foto_capa_url,cidade,onboarding_concluido,onboarding_etapa,produtos_modulo_ativo,pix_modulo_ativo,trial_ativo,trial_inicio_em,trial_fim_em,status,plano").eq("id", idSalao).maybeSingle(),
    db.from("configuracoes_salao").select("hora_abertura,hora_fechamento,dias_funcionamento,sinal_pix_chave,sinal_pix_recebedor,sinal_pix_cidade").eq("id_salao", idSalao).maybeSingle(),
    db.from("servicos").select("id,nome,duracao_minutos,preco_padrao,onboarding_chave").eq("id_salao", idSalao).eq("ativo", true).order("nome"),
    db.from("profissionais").select("id,nome,cargo,especialidades,dias_trabalho,onboarding_chave").eq("id_salao", idSalao).eq("ativo", true).order("nome"),
    db.from("produtos").select("id,nome,onboarding_chave").eq("id_salao", idSalao).eq("ativo", true).order("nome"),
    db.from("profissional_servicos").select("id,id_profissional,id_servico").eq("id_salao", idSalao).eq("ativo", true),
  ]);
  if (salaoR.error || !salaoR.data) throw new Error(salaoR.error?.message || "Salão não encontrado.");
  for (const result of [configR, serviceR, proR, productR, linkR]) if (result.error) throw result.error;
  return {
    salao: salaoR.data,
    config: configR.data || null,
    servicos: serviceR.data || [],
    profissionais: proR.data || [],
    produtos: productR.data || [],
    vinculos: linkR.data || [],
  };
}

async function saveStage(idSalao: string, stage: string) {
  const db = getDatabaseAdmin() as any;
  const { error } = await db.from("saloes").update({ onboarding_etapa: stage, updated_at: new Date().toISOString() }).eq("id", idSalao);
  if (error) throw error;
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
    return NextResponse.json({ ok: true, ...(await loadState(auth.idSalao!)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar onboarding." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
    const idSalao = auth.idSalao!;
    const db = getDatabaseAdmin() as any;
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const action = text(body.action, 40);
    const now = new Date().toISOString();

    const { data: current, error: currentError } = await db.from("saloes").select("onboarding_concluido").eq("id", idSalao).maybeSingle();
    if (currentError || !current) throw currentError || new Error("Salão não encontrado.");
    if (current.onboarding_concluido === true && action !== "status") {
      return NextResponse.json({ ok: true, alreadyCompleted: true, completed: true });
    }

    if (action === "perfil") {
      const payload = {
        nome: text(body.nome, 160),
        whatsapp: text(body.whatsapp, 40),
        descricao_publica: text(body.descricao, 1200),
        instagram_url: text(body.instagram, 300) || null,
        logo_url: text(body.logoUrl, 1000),
        foto_capa_url: text(body.capaUrl, 1000) || null,
      };
      if (!payload.nome || !payload.whatsapp || !payload.descricao_publica || !payload.logo_url) {
        return NextResponse.json({ error: "Informe nome, WhatsApp, descrição e a logo do salão." }, { status: 400 });
      }
      const { error } = await db.from("saloes").update({ ...payload, telefone: payload.whatsapp, onboarding_etapa: "servicos", updated_at: now }).eq("id", idSalao);
      if (error) throw error;
    } else if (action === "servicos") {
      for (const raw of Array.isArray(body.items) ? body.items : []) {
        const key = idem(raw.key);
        const nome = text(raw.nome, 180);
        if (!key || !nome) continue;
        const { data: found } = await db.from("servicos").select("id").eq("id_salao", idSalao).eq("onboarding_chave", key).maybeSingle();
        if (found?.id) continue;
        const duration = Math.max(5, Math.min(720, Math.round(numberValue(raw.duracao, 30))));
        const price = Math.max(0, numberValue(raw.preco, 0));
        const { error } = await db.from("servicos").insert({ id_salao: idSalao, nome, categoria: text(raw.categoria, 120) || null, duracao: duration, duracao_minutos: duration, preco: price, preco_padrao: price, status: "ativo", ativo: true, app_cliente_visivel: true, onboarding_chave: key });
        if (error && error.code !== "23505") throw error;
      }
      const { count, error } = await db.from("servicos").select("id", { count: "exact", head: true }).eq("id_salao", idSalao).eq("ativo", true);
      if (error) throw error;
      if (!count) return NextResponse.json({ error: "Cadastre pelo menos um serviço." }, { status: 400 });
      await saveStage(idSalao, "profissionais");
    } else if (action === "profissionais") {
      const days = normalizeDays(body.dias);
      const start = text(body.inicio, 8) || "08:00";
      const end = text(body.fim, 8) || "18:00";
      const { data: activeServices, error: servicesError } = await db.from("servicos").select("id,nome,onboarding_chave").eq("id_salao", idSalao).eq("ativo", true);
      if (servicesError) throw servicesError;
      if (!activeServices?.length) return NextResponse.json({ error: "Cadastre um serviço antes dos profissionais." }, { status: 400 });

      for (const raw of Array.isArray(body.items) ? body.items : []) {
        const key = idem(raw.key);
        const nome = text(raw.nome, 180);
        if (!key || !nome) continue;
        let profissionalId = "";
        const { data: found } = await db.from("profissionais").select("id").eq("id_salao", idSalao).eq("onboarding_chave", key).maybeSingle();
        if (found?.id) profissionalId = String(found.id);
        else {
          const { data: created, error } = await db.from("profissionais").insert({
            id_salao: idSalao,
            nome,
            nome_exibicao: nome,
            cargo: text(raw.cargo, 120) || null,
            categoria: text(raw.cargo, 120) || null,
            especialidades: Array.isArray(raw.especialidades) ? raw.especialidades.map((v: unknown) => text(v, 120)).filter(Boolean) : text(raw.especialidades, 500).split(",").map((v) => v.trim()).filter(Boolean),
            dias_trabalho: workDays(days, start, end),
            pausas: [],
            tipo_profissional: "profissional",
            tipo_vinculo: "AUTONOMO",
            nivel_acesso: "proprio",
            intervalo_agenda_minutos: 30,
            status: "ativo",
            ativo: true,
            app_cliente_visivel: true,
            onboarding_chave: key,
          }).select("id").single();
          if (error && error.code !== "23505") throw error;
          profissionalId = String(created?.id || "");
          if (!profissionalId) {
            const { data: raced } = await db.from("profissionais").select("id").eq("id_salao", idSalao).eq("onboarding_chave", key).maybeSingle();
            profissionalId = String(raced?.id || "");
          }
        }
        if (!profissionalId) continue;
        const requested = Array.isArray(raw.servicos) ? raw.servicos.map((value: unknown) => idem(value)).filter(Boolean) : [];
        const serviceIds = activeServices.filter((service: any) => !requested.length || requested.includes(String(service.onboarding_chave || service.id))).map((service: any) => service.id);
        const links = serviceIds.map((serviceId: string) => ({ id_salao: idSalao, id_profissional: profissionalId, id_servico: serviceId, ativo: true }));
        if (links.length) {
          const { error } = await db.from("profissional_servicos").upsert(links, { onConflict: "id_profissional,id_servico" });
          if (error) throw error;
        }
      }

      const [{ count: proCount, error: proError }, { count: linkCount, error: linkError }] = await Promise.all([
        db.from("profissionais").select("id", { count: "exact", head: true }).eq("id_salao", idSalao).eq("ativo", true),
        db.from("profissional_servicos").select("id", { count: "exact", head: true }).eq("id_salao", idSalao).eq("ativo", true),
      ]);
      if (proError || linkError) throw proError || linkError;
      if (!proCount) return NextResponse.json({ error: "Cadastre pelo menos um profissional." }, { status: 400 });
      if (!linkCount) return NextResponse.json({ error: "Vincule pelo menos um serviço ao profissional." }, { status: 400 });
      await saveStage(idSalao, "produtos");
    } else if (action === "produtos") {
      const enabled = body.ativo !== false;
      const { error: prefError } = await db.from("saloes").update({ produtos_modulo_ativo: enabled, updated_at: now }).eq("id", idSalao);
      if (prefError) throw prefError;
      if (enabled) {
        for (const raw of Array.isArray(body.items) ? body.items : []) {
          const key = idem(raw.key);
          const nome = text(raw.nome, 180);
          if (!key || !nome) continue;
          const { data: found } = await db.from("produtos").select("id").eq("id_salao", idSalao).eq("onboarding_chave", key).maybeSingle();
          if (found?.id) continue;
          const cost = Math.max(0, numberValue(raw.custo));
          const sale = Math.max(0, numberValue(raw.venda));
          const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0;
          const { error } = await db.from("produtos").insert({ id_salao: idSalao, nome, categoria: text(raw.categoria, 120) || null, unidade_medida: "un", quantidade_por_embalagem: 1, preco_custo: cost, custos_extras: 0, custo_real: cost, custo_por_dose: cost, dose_padrao: 1, unidade_dose: "un", preco_venda: sale, margem_lucro_percentual: margin, estoque_atual: Math.max(0, numberValue(raw.estoque)), estoque_minimo: 0, destinacao: "uso_interno", comissao_revenda_percentual: 0, status: "ativo", ativo: true, onboarding_chave: key });
          if (error && error.code !== "23505") throw error;
        }
        const { count, error } = await db.from("produtos").select("id", { count: "exact", head: true }).eq("id_salao", idSalao).eq("ativo", true);
        if (error) throw error;
        if (!count) return NextResponse.json({ error: "Cadastre um produto ou desative Produtos e Estoque." }, { status: 400 });
      }
      await saveStage(idSalao, "pix");
    } else if (action === "pix") {
      const enabled = body.ativo !== false;
      const pixKey = text(body.chave, 200);
      const receiver = text(body.recebedor, 200);
      const city = text(body.cidade, 120);
      if (enabled && (!pixKey || !receiver || !city)) return NextResponse.json({ error: "Preencha chave Pix, recebedor e cidade, ou escolha configurar depois." }, { status: 400 });
      const { error: salonError } = await db.from("saloes").update({ pix_modulo_ativo: enabled, onboarding_etapa: "horarios", updated_at: now }).eq("id", idSalao);
      if (salonError) throw salonError;
      const { error: configError } = await db.from("configuracoes_salao").update({ sinal_pix_chave: enabled ? pixKey : null, sinal_pix_recebedor: enabled ? receiver : null, sinal_pix_cidade: enabled ? city : null, updated_at: now }).eq("id_salao", idSalao);
      if (configError) throw configError;
    } else if (action === "horarios") {
      const days = normalizeDays(body.dias);
      const start = text(body.inicio, 8);
      const end = text(body.fim, 8);
      if (!days.length || !start || !end || start >= end) return NextResponse.json({ error: "Informe dias e horários válidos de atendimento." }, { status: 400 });
      const { error: configError } = await db.from("configuracoes_salao").update({ hora_abertura: start, hora_fechamento: end, dias_funcionamento: days, updated_at: now }).eq("id_salao", idSalao);
      if (configError) throw configError;
      const { error: proError } = await db.from("profissionais").update({ dias_trabalho: workDays(days, start, end) }).eq("id_salao", idSalao).not("onboarding_chave", "is", null);
      if (proError) throw proError;
      await saveStage(idSalao, "revisao");
    } else if (action === "voltar") {
      const stage = text(body.etapa, 30);
      if (!ETAPAS.has(stage)) return NextResponse.json({ error: "Etapa inválida." }, { status: 400 });
      await saveStage(idSalao, stage);
    } else if (action === "finalizar") {
      const state = await loadState(idSalao);
      const { salao, config, servicos, profissionais, produtos, vinculos } = state;
      const days = normalizeDays(config?.dias_funcionamento);
      if (!text(salao.nome) || !text(salao.whatsapp || salao.telefone) || !text(salao.descricao_publica, 1200) || !text(salao.logo_url, 1000)) return NextResponse.json({ error: "Complete o perfil e envie a logo do salão." }, { status: 400 });
      if (!servicos.length) return NextResponse.json({ error: "Cadastre pelo menos um serviço." }, { status: 400 });
      if (!profissionais.length) return NextResponse.json({ error: "Cadastre pelo menos um profissional." }, { status: 400 });
      if (!vinculos.length) return NextResponse.json({ error: "Vincule pelo menos um serviço a um profissional." }, { status: 400 });
      if (!profissionais.some((professional: any) => Array.isArray(professional.dias_trabalho) && professional.dias_trabalho.some((day: any) => day?.ativo === true))) return NextResponse.json({ error: "Configure disponibilidade para pelo menos um profissional." }, { status: 400 });
      if (salao.produtos_modulo_ativo !== false && !produtos.length) return NextResponse.json({ error: "Cadastre um produto ou desative Produtos e Estoque." }, { status: 400 });
      if (salao.pix_modulo_ativo !== false && (!text(config?.sinal_pix_chave) || !text(config?.sinal_pix_recebedor) || !text(config?.sinal_pix_cidade))) return NextResponse.json({ error: "Configure o Pix ou escolha configurar depois." }, { status: 400 });
      if (!days.length || !config?.hora_abertura || !config?.hora_fechamento || String(config.hora_abertura).slice(0, 5) >= String(config.hora_fechamento).slice(0, 5)) return NextResponse.json({ error: "Configure dias e horários válidos de atendimento." }, { status: 400 });

      const { data: activeSubscription, error: subscriptionError } = await db.from("assinaturas").select("id").eq("id_salao", idSalao).in("status", ["teste_gratis", "ativo"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (subscriptionError) throw subscriptionError;
      if (!activeSubscription) await createCadastroSalaoService().ativarTrialInicial(idSalao);

      const { error: completeError } = await db.from("saloes").update({ onboarding_concluido: true, onboarding_etapa: "concluido", onboarding_concluido_em: now, updated_at: now }).eq("id", idSalao);
      if (completeError) throw completeError;
      revalidatePath("/dashboard");
      revalidatePath("/produtos");
      revalidatePath("/estoque");
      return NextResponse.json({ ok: true, completed: true });
    } else {
      return NextResponse.json({ error: "Ação de onboarding inválida." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, ...(await loadState(idSalao)) });
  } catch (error) {
    console.error("[ONBOARDING_SALAO_ERROR]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar configuração inicial." }, { status: 500 });
  }
}
