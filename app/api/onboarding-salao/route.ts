import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createCadastroSalaoService } from "@/services/cadastroSalaoService";

const DIAS = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
] as const;

function texto(value: unknown, max = 240) {
  return String(value || "").trim().slice(0, max);
}

function numero(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function chave(value: unknown) {
  return texto(value, 100).replace(/[^a-zA-Z0-9:_-]/g, "");
}

function normalizarDias(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  const mapa: Record<string, string> = {
    segunda: "segunda",
    "segunda-feira": "segunda",
    terça: "terca",
    terca: "terca",
    "terça-feira": "terca",
    "terca-feira": "terca",
    quarta: "quarta",
    "quarta-feira": "quarta",
    quinta: "quinta",
    "quinta-feira": "quinta",
    sexta: "sexta",
    "sexta-feira": "sexta",
    sábado: "sabado",
    sabado: "sabado",
    domingo: "domingo",
  };
  return [...new Set(value.map((item) => mapa[texto(item, 30).toLowerCase()]).filter(Boolean))];
}

function diasTrabalho(dias: string[], inicio: string, fim: string) {
  return DIAS.map((dia) => ({
    dia,
    inicio,
    fim,
    ativo: dias.includes(dia),
  }));
}

async function contextoAdmin() {
  const { user, usuario } = await getPainelUserContext();
  if (!user || !usuario?.id_salao) {
    return { error: NextResponse.json({ error: "Sessao expirada." }, { status: 401 }) };
  }
  if (String(usuario.nivel || "").toLowerCase() !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Somente o administrador do salao pode concluir a configuracao inicial." },
        { status: 403 }
      ),
    };
  }
  return { user, usuario, idSalao: usuario.id_salao };
}

async function carregarEstado(idSalao: string) {
  const admin = getSupabaseAdmin();
  const [salaoR, configR, servicosR, profissionaisR, produtosR, vinculosR] = await Promise.all([
    admin
      .from("saloes")
      .select(
        "id,nome,whatsapp,telefone,descricao_publica,instagram_url,logo_url,foto_capa_url,cidade,onboarding_concluido,onboarding_etapa,produtos_modulo_ativo,pix_modulo_ativo,trial_ativo,trial_inicio_em,trial_fim_em,status,plano"
      )
      .eq("id", idSalao)
      .maybeSingle(),
    admin
      .from("configuracoes_salao")
      .select("hora_abertura,hora_fechamento,dias_funcionamento,sinal_pix_chave,sinal_pix_recebedor,sinal_pix_cidade")
      .eq("id_salao", idSalao)
      .maybeSingle(),
    admin
      .from("servicos")
      .select("id,nome,duracao_minutos,preco_padrao,onboarding_chave")
      .eq("id_salao", idSalao)
      .eq("ativo", true)
      .order("nome"),
    admin
      .from("profissionais")
      .select("id,nome,cargo,especialidades,dias_trabalho,onboarding_chave")
      .eq("id_salao", idSalao)
      .eq("ativo", true)
      .order("nome"),
    admin
      .from("produtos")
      .select("id,nome,onboarding_chave")
      .eq("id_salao", idSalao)
      .eq("ativo", true)
      .order("nome"),
    admin
      .from("profissional_servicos")
      .select("id,id_profissional,id_servico")
      .eq("id_salao", idSalao)
      .eq("ativo", true),
  ]);

  if (salaoR.error || !salaoR.data) {
    throw new Error(salaoR.error?.message || "Salao nao encontrado.");
  }
  if (configR.error) throw configR.error;
  if (servicosR.error) throw servicosR.error;
  if (profissionaisR.error) throw profissionaisR.error;
  if (produtosR.error) throw produtosR.error;
  if (vinculosR.error) throw vinculosR.error;

  return {
    salao: salaoR.data,
    config: configR.data,
    servicos: servicosR.data || [],
    profissionais: profissionaisR.data || [],
    produtos: produtosR.data || [],
    vinculos: vinculosR.data || [],
  };
}

export async function GET() {
  try {
    const ctx = await contextoAdmin();
    if (ctx.error) return ctx.error;
    const estado = await carregarEstado(ctx.idSalao!);
    return NextResponse.json({ ok: true, ...estado });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar onboarding." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await contextoAdmin();
    if (ctx.error) return ctx.error;
    const idSalao = ctx.idSalao!;
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const action = texto(body.action, 50);
    const admin = getSupabaseAdmin();
    const agora = new Date().toISOString();

    const { data: salaoAtual, error: salaoAtualError } = await admin
      .from("saloes")
      .select("onboarding_concluido,onboarding_etapa")
      .eq("id", idSalao)
      .maybeSingle();
    if (salaoAtualError || !salaoAtual) throw salaoAtualError || new Error("Salao nao encontrado.");

    if (salaoAtual.onboarding_concluido === true && action !== "status") {
      return NextResponse.json({ ok: true, alreadyCompleted: true });
    }

    if (action === "perfil") {
      const nome = texto(body.nome, 160);
      const whatsapp = texto(body.whatsapp, 40);
      const descricao = texto(body.descricao, 1200);
      const instagram = texto(body.instagram, 300);
      const logoUrl = texto(body.logoUrl, 1000);
      const capaUrl = texto(body.capaUrl, 1000);
      if (!nome || !whatsapp || !descricao || !logoUrl) {
        return NextResponse.json(
          { error: "Informe nome, WhatsApp, descricao e a logo do salao." },
          { status: 400 }
        );
      }
      const { error } = await admin
        .from("saloes")
        .update({
          nome,
          whatsapp,
          telefone: whatsapp,
          descricao_publica: descricao,
          instagram_url: instagram || null,
          logo_url: logoUrl,
          foto_capa_url: capaUrl || null,
          onboarding_etapa: "servicos",
          updated_at: agora,
        })
        .eq("id", idSalao);
      if (error) throw error;
    } else if (action === "servicos") {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) {
        return NextResponse.json({ error: "Cadastre pelo menos um servico." }, { status: 400 });
      }
      for (const raw of items) {
        const key = chave(raw.key);
        const nome = texto(raw.nome, 180);
        if (!key || !nome) continue;
        const { data: existente } = await admin
          .from("servicos")
          .select("id")
          .eq("id_salao", idSalao)
          .eq("onboarding_chave", key)
          .maybeSingle();
        if (existente?.id) continue;
        const duracao = Math.max(5, Math.min(720, Math.round(numero(raw.duracao, 30))));
        const preco = Math.max(0, numero(raw.preco, 0));
        const { error } = await admin.from("servicos").insert({
          id_salao: idSalao,
          nome,
          categoria: texto(raw.categoria, 120) || null,
          duracao: duracao,
          duracao_minutos: duracao,
          preco: preco,
          preco_padrao: preco,
          status: "ativo",
          ativo: true,
          app_cliente_visivel: true,
          onboarding_chave: key,
        });
        if (error && error.code !== "23505") throw error;
      }
      const { count } = await admin
        .from("servicos")
        .select("id", { count: "exact", head: true })
        .eq("id_salao", idSalao)
        .eq("ativo", true);
      if (!count) return NextResponse.json({ error: "Cadastre pelo menos um servico." }, { status: 400 });
      const { error } = await admin.from("saloes").update({ onboarding_etapa: "profissionais", updated_at: agora }).eq("id", idSalao);
      if (error) throw error;
    } else if (action === "profissionais") {
      const items = Array.isArray(body.items) ? body.items : [];
      const dias = normalizarDias(body.dias);
      const inicio = texto(body.inicio, 8) || "08:00";
      const fim = texto(body.fim, 8) || "18:00";
      if (!items.length) return NextResponse.json({ error: "Cadastre pelo menos um profissional." }, { status: 400 });
      const { data: servicos } = await admin
        .from("servicos")
        .select("id,onboarding_chave")
        .eq("id_salao", idSalao)
        .eq("ativo", true);
      if (!servicos?.length) return NextResponse.json({ error: "Cadastre um servico antes dos profissionais." }, { status: 400 });

      for (const raw of items) {
        const key = chave(raw.key);
        const nome = texto(raw.nome, 180);
        if (!key || !nome) continue;
        let profissionalId = "";
        const { data: existente } = await admin
          .from("profissionais")
          .select("id")
          .eq("id_salao", idSalao)
          .eq("onboarding_chave", key)
          .maybeSingle();
        if (existente?.id) {
          profissionalId = String(existente.id);
        } else {
          const { data: criado, error } = await admin
            .from("profissionais")
            .insert({
              id_salao: idSalao,
              nome,
              nome_exibicao: nome,
              cargo: texto(raw.cargo, 120) || null,
              categoria: texto(raw.cargo, 120) || null,
              especialidades: Array.isArray(raw.especialidades)
                ? raw.especialidades.map((v: unknown) => texto(v, 120)).filter(Boolean)
                : texto(raw.especialidades, 500).split(",").map((v) => v.trim()).filter(Boolean),
              dias_trabalho: diasTrabalho(dias, inicio, fim),
              pausas: [],
              tipo_profissional: "profissional",
              tipo_vinculo: "AUTONOMO",
              nivel_acesso: "proprio",
              intervalo_agenda_minutos: 30,
              status: "ativo",
              ativo: true,
              app_cliente_visivel: true,
              onboarding_chave: key,
            })
            .select("id")
            .single();
          if (error) {
            if (error.code !== "23505") throw error;
            const { data: concorrente } = await admin.from("profissionais").select("id").eq("id_salao", idSalao).eq("onboarding_chave", key).single();
            profissionalId = String(concorrente?.id || "");
          } else profissionalId = String(criado.id);
        }
        if (!profissionalId) continue;
        const requestedKeys = Array.isArray(raw.servicos)
          ? raw.servicos.map((v: unknown) => chave(v)).filter(Boolean)
          : [];
        const ids = servicos
          .filter((s) => !requestedKeys.length || requestedKeys.includes(String(s.onboarding_chave || "")))
          .map((s) => s.id);
        const links = ids.map((idServico) => ({
          id_salao: idSalao,
          id_profissional: profissionalId,
          id_servico: idServico,
          ativo: true,
        }));
        if (links.length) {
          const { error } = await admin
            .from("profissional_servicos")
            .upsert(links, { onConflict: "id_profissional,id_servico" });
          if (error) throw error;
        }
      }
      const { count } = await admin.from("profissionais").select("id", { count: "exact", head: true }).eq("id_salao", idSalao).eq("ativo", true);
      if (!count) return NextResponse.json({ error: "Cadastre pelo menos um profissional." }, { status: 400 });
      const { error } = await admin.from("saloes").update({ onboarding_etapa: "produtos", updated_at: agora }).eq("id", idSalao);
      if (error) throw error;
    } else if (action === "produtos") {
      const usar = body.ativo !== false;
      const { error: prefError } = await admin.from("saloes").update({ produtos_modulo_ativo: usar, updated_at: agora }).eq("id", idSalao);
      if (prefError) throw prefError;
      if (usar) {
        const items = Array.isArray(body.items) ? body.items : [];
        if (!items.length) return NextResponse.json({ error: "Cadastre um produto ou desative a funcionalidade." }, { status: 400 });
        for (const raw of items) {
          const key = chave(raw.key);
          const nome = texto(raw.nome, 180);
          if (!key || !nome) continue;
          const { data: existente } = await admin.from("produtos").select("id").eq("id_salao", idSalao).eq("onboarding_chave", key).maybeSingle();
          if (existente?.id) continue;
          const custo = Math.max(0, numero(raw.custo, 0));
          const venda = Math.max(0, numero(raw.venda, 0));
          const margem = venda > 0 ? ((venda - custo) / venda) * 100 : 0;
          const { error } = await admin.from("produtos").insert({
            id_salao: idSalao,
            nome,
            categoria: texto(raw.categoria, 120) || null,
            unidade_medida: "un",
            quantidade_por_embalagem: 1,
            preco_custo: custo,
            custos_extras: 0,
            custo_real: custo,
            custo_por_dose: custo,
            dose_padrao: 1,
            unidade_dose: "un",
            preco_venda: venda,
            margem_lucro_percentual: margem,
            estoque_atual: Math.max(0, numero(raw.estoque, 0)),
            estoque_minimo: 0,
            destinacao: "uso_interno",
            comissao_revenda_percentual: 0,
            status: "ativo",
            ativo: true,
            onboarding_chave: key,
          });
          if (error && error.code !== "23505") throw error;
        }
        const { count } = await admin.from("produtos").select("id", { count: "exact", head: true }).eq("id_salao", idSalao).eq("ativo", true);
        if (!count) return NextResponse.json({ error: "Cadastre um produto ou desative a funcionalidade." }, { status: 400 });
      }
      const { error } = await admin.from("saloes").update({ onboarding_etapa: "pix", updated_at: agora }).eq("id", idSalao);
      if (error) throw error;
    } else if (action === "pix") {
      const usar = body.ativo !== false;
      const chavePix = texto(body.chave, 200);
      const recebedor = texto(body.recebedor, 200);
      const cidade = texto(body.cidade, 120);
      if (usar && (!chavePix || !recebedor || !cidade)) {
        return NextResponse.json({ error: "Preencha chave Pix, recebedor e cidade, ou escolha configurar depois." }, { status: 400 });
      }
      const { error: salaoError } = await admin.from("saloes").update({ pix_modulo_ativo: usar, onboarding_etapa: "horarios", updated_at: agora }).eq("id", idSalao);
      if (salaoError) throw salaoError;
      const { error: configError } = await admin.from("configuracoes_salao").update({
        sinal_pix_chave: usar ? chavePix : null,
        sinal_pix_recebedor: usar ? recebedor : null,
        sinal_pix_cidade: usar ? cidade : null,
        updated_at: agora,
      }).eq("id_salao", idSalao);
      if (configError) throw configError;
    } else if (action === "horarios") {
      const dias = normalizarDias(body.dias);
      const inicio = texto(body.inicio, 8);
      const fim = texto(body.fim, 8);
      if (!dias.length || !inicio || !fim || inicio >= fim) {
        return NextResponse.json({ error: "Informe dias e horarios validos de atendimento." }, { status: 400 });
      }
      const { error: configError } = await admin.from("configuracoes_salao").update({ hora_abertura: inicio, hora_fechamento: fim, dias_funcionamento: dias, updated_at: agora }).eq("id_salao", idSalao);
      if (configError) throw configError;
      const { error: profError } = await admin.from("profissionais").update({ dias_trabalho: diasTrabalho(dias, inicio, fim), updated_at: agora } as any).eq("id_salao", idSalao).not("onboarding_chave", "is", null);
      if (profError && !/updated_at/i.test(profError.message || "")) throw profError;
      const { error: salaoError } = await admin.from("saloes").update({ onboarding_etapa: "revisao", updated_at: agora }).eq("id", idSalao);
      if (salaoError) throw salaoError;
    } else if (action === "voltar") {
      const permitidas = new Set(["perfil", "servicos", "profissionais", "produtos", "pix", "horarios", "revisao"]);
      const etapa = texto(body.etapa, 30);
      if (!permitidas.has(etapa)) return NextResponse.json({ error: "Etapa invalida." }, { status: 400 });
      const { error } = await admin.from("saloes").update({ onboarding_etapa: etapa, updated_at: agora }).eq("id", idSalao);
      if (error) throw error;
    } else if (action === "finalizar") {
      const estado = await carregarEstado(idSalao);
      const { salao, config, servicos, profissionais, produtos, vinculos } = estado;
      const dias = normalizarDias(config?.dias_funcionamento);
      if (!texto(salao.nome) || !texto(salao.whatsapp || salao.telefone) || !texto(salao.descricao_publica, 1200) || !texto(salao.logo_url, 1000)) {
        return NextResponse.json({ error: "Complete o perfil e envie a logo do salao." }, { status: 400 });
      }
      if (servicos.length < 1) return NextResponse.json({ error: "Cadastre pelo menos um servico." }, { status: 400 });
      if (profissionais.length < 1) return NextResponse.json({ error: "Cadastre pelo menos um profissional." }, { status: 400 });
      if (vinculos.length < 1) return NextResponse.json({ error: "Vincule pelo menos um servico a um profissional." }, { status: 400 });
      const profissionalDisponivel = profissionais.some((p: any) => Array.isArray(p.dias_trabalho) && p.dias_trabalho.some((d: any) => d?.ativo === true));
      if (!profissionalDisponivel) return NextResponse.json({ error: "Configure disponibilidade para pelo menos um profissional." }, { status: 400 });
      if (salao.produtos_modulo_ativo !== false && produtos.length < 1) return NextResponse.json({ error: "Cadastre um produto ou desative Produtos e Estoque." }, { status: 400 });
      if (salao.pix_modulo_ativo !== false && (!texto(config?.sinal_pix_chave) || !texto(config?.sinal_pix_recebedor) || !texto(config?.sinal_pix_cidade))) {
        return NextResponse.json({ error: "Configure o Pix ou escolha configurar depois." }, { status: 400 });
      }
      if (!dias.length || !config?.hora_abertura || !config?.hora_fechamento) return NextResponse.json({ error: "Configure os dias e horarios de atendimento." }, { status: 400 });

      const { data: assinaturaExistente, error: assinaturaErro } = await admin
        .from("assinaturas")
        .select("id,status,trial_inicio_em,trial_fim_em")
        .eq("id_salao", idSalao)
        .in("status", ["teste_gratis", "ativo"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (assinaturaErro) throw assinaturaErro;
      if (!assinaturaExistente) {
        await createCadastroSalaoService().ativarTrialInicial(idSalao);
      }

      const { error: concluirError } = await admin.from("saloes").update({
        onboarding_concluido: true,
        onboarding_etapa: "concluido",
        onboarding_concluido_em: agora,
        updated_at: agora,
      }).eq("id", idSalao);
      if (concluirError) throw concluirError;

      revalidateTag("painel-shell-context", "max");
      revalidatePath("/dashboard");
      return NextResponse.json({ ok: true, completed: true });
    } else {
      return NextResponse.json({ error: "Acao de onboarding invalida." }, { status: 400 });
    }

    const estado = await carregarEstado(idSalao);
    return NextResponse.json({ ok: true, ...estado });
  } catch (error) {
    console.error("[ONBOARDING_SALAO_ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar configuracao inicial." },
      { status: 500 }
    );
  }
}
