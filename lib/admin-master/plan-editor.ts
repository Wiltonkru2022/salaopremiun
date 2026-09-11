import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AdminMasterPlanEditorData } from "@/components/admin-master/AdminMasterPlanEditor";

export async function getAdminMasterPlanEditorData(): Promise<AdminMasterPlanEditorData> {
  const supabase = getSupabaseAdmin();
  const [{ data: planos }, { data: recursos }] = await Promise.all([
    supabase
      .from("planos_saas")
      .select(
        "id, codigo, nome, subtitulo, valor_mensal, preco_anual, limite_usuarios, limite_profissionais, trial_dias, ideal_para, cta, destaque, ativo, ordem"
      )
      .order("ordem", { ascending: true }),
    supabase
      .from("planos_recursos")
      .select("id_plano, recurso_codigo, habilitado, limite_numero, observacao"),
  ]);

  const planRows = ((planos || []) as {
    id: string;
    codigo?: string | null;
    nome?: string | null;
    subtitulo?: string | null;
    valor_mensal?: number | null;
    preco_anual?: number | null;
    limite_usuarios?: number | null;
    limite_profissionais?: number | null;
    trial_dias?: number | null;
    ideal_para?: string | null;
    cta?: string | null;
    destaque?: boolean | null;
    ativo?: boolean | null;
    ordem?: number | null;
  }[]).map((plano) => ({
    id: plano.id,
    codigo: plano.codigo || "-",
    nome: plano.nome || plano.codigo || "Plano",
    subtitulo: plano.subtitulo || null,
    valor_mensal: Number(plano.valor_mensal || 0),
    preco_anual: plano.preco_anual === null || plano.preco_anual === undefined ? null : Number(plano.preco_anual),
    limite_usuarios: Number(plano.limite_usuarios || 0),
    limite_profissionais: Number(plano.limite_profissionais || 0),
    trial_dias: plano.trial_dias ?? 0,
    ideal_para: plano.ideal_para || null,
    cta: plano.cta || null,
    destaque: plano.destaque ?? false,
    ativo: plano.ativo !== false,
    ordem: plano.ordem ?? 0,
  }));

  const resourceRows = ((recursos || []) as {
    id_plano?: string | null;
    recurso_codigo?: string | null;
    habilitado?: boolean | null;
    limite_numero?: number | null;
    observacao?: string | null;
  }[]).filter((recurso) => recurso.id_plano && recurso.recurso_codigo);
  const resourceCodes = Array.from(
    new Set(resourceRows.map((recurso) => String(recurso.recurso_codigo || "").trim()).filter(Boolean))
  ).sort();

  const recursosEditaveis = planRows.flatMap((plano) =>
    resourceCodes.map((codigo) => {
      const current = resourceRows.find(
        (recurso) => recurso.id_plano === plano.id && recurso.recurso_codigo === codigo
      );

      return {
        idPlano: plano.id,
        planoCodigo: plano.codigo,
        planoNome: plano.nome,
        recursoCodigo: codigo,
        habilitado: current?.habilitado === true,
        limiteNumero: current?.limite_numero ?? null,
        observacao: current?.observacao || null,
        existe: Boolean(current),
      };
    })
  );

  return {
    planos: planRows,
    recursos: recursosEditaveis,
  };
}
