import type { DatabaseClient } from "@/lib/db/types";
import { buildLoginRedirectUrl } from "@/lib/auth/login-redirect";
import type { PainelSessionSnapshot } from "@/lib/painel/session-snapshot";
import { PERMISSIONS, type PermissionKey, type UserNivel } from "@/lib/permissions";
import type { Cliente, ConfigSalao, Profissional, Servico } from "@/types/agenda";

type AuthUser = { id: string };
type ComboServicoAgendaRow = { id_servico_combo?: string | null; id_servico_item?: string | null; ativo?: boolean | null };

function montarPermissoesPorNivel(userNivel: UserNivel) {
  const keys = Object.keys(PERMISSIONS) as PermissionKey[];
  return keys.reduce<Record<string, boolean>>((acc, key) => { acc[key] = PERMISSIONS[key].includes(userNivel); return acc; }, {});
}
function diferencaEmDias(dataAlvo: Date, dataBase: Date) { const alvo = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate()); const base = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate()); return Math.ceil((alvo.getTime() - base.getTime()) / 86400000); }
function parseDataAssinatura(valor?: string | null) { if (!valor) return null; const texto = String(valor).trim(); if (!texto) return null; const completa = new Date(texto); if (!Number.isNaN(completa.getTime())) return completa; if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) { const data = new Date(`${texto}T23:59:59`); if (!Number.isNaN(data.getTime())) return data; } return null; }
function intersectProfessionalIds(serviceIds: string[], linksByService: Map<string, string[]>) { if (!serviceIds.length) return []; const [first, ...others] = serviceIds; return (linksByService.get(first) || []).filter((id) => others.every((serviceId) => (linksByService.get(serviceId) || []).includes(id))); }
function getAssinaturaBloqueada(params: { status?: string | null; vencimentoEm?: string | null; trialFimEm?: string | null }) { const status = String(params.status || "").toLowerCase(); const base = ["teste_gratis", "trial"].includes(status) ? params.trialFimEm || params.vencimentoEm || null : params.vencimentoEm || params.trialFimEm || null; if (!status || !base) return true; const vencimento = parseDataAssinatura(base); if (!vencimento) return true; const dias = diferencaEmDias(vencimento, new Date()); const vencida = dias < 0; const atraso = vencida ? Math.abs(dias) : 0; if (["teste_gratis", "trial"].includes(status)) return vencida; if (["ativo", "ativa", "pago", "pendente", "aguardando_pagamento"].includes(status)) return vencida && atraso > 3; return true; }

export async function initAgendaPage(params: { supabase: DatabaseClient; safeGetAuthUser: () => Promise<AuthUser | null>; sessionSnapshot?: PainelSessionSnapshot | null }): Promise<{ ok: boolean; redirectTo?: string | null; erroTela?: string; permissoes?: Record<string, boolean> | null; idSalao?: string; config?: ConfigSalao | null; profissionais?: Profissional[]; clientes?: Cliente[]; servicos?: Servico[]; assinaturaBloqueada?: boolean }> {
  const { supabase, safeGetAuthUser, sessionSnapshot } = params;
  let salaoId = sessionSnapshot?.idSalao || "";
  let userNivel = String(sessionSnapshot?.nivel || "recepcao") as UserNivel;
  let permissoesNivel = sessionSnapshot?.permissoes || montarPermissoesPorNivel(userNivel);
  if (!salaoId) {
    const user = await safeGetAuthUser();
    if (!user) return { ok: false, redirectTo: buildLoginRedirectUrl("sessao_expirada", { returnTo: "/agenda", context: "agenda" }), erroTela: "Usuario nao autenticado." };
    const usuarioRes = await supabase.from("usuarios").select("id, id_salao, status, auth_user_id, nivel").eq("auth_user_id", user.id).maybeSingle();
    if (usuarioRes.error) { console.error("Erro ao buscar usuario logado:", usuarioRes.error); return { ok: false, erroTela: "Nao foi possivel carregar os dados do usuario logado." }; }
    if (!usuarioRes.data?.id_salao) return { ok: false, erroTela: "Nao foi possivel identificar o salao do usuario logado." };
    if (usuarioRes.data.status && usuarioRes.data.status !== "ativo") return { ok: false, redirectTo: buildLoginRedirectUrl("usuario_inativo", { returnTo: "/agenda", context: "agenda" }), erroTela: "Usuario vinculado, mas inativo." };
    salaoId = usuarioRes.data.id_salao; userNivel = String(usuarioRes.data.nivel || "recepcao") as UserNivel; permissoesNivel = montarPermissoesPorNivel(userNivel);
  }
  if (!permissoesNivel.agenda_ver) return { ok: true, permissoes: permissoesNivel, redirectTo: "/dashboard" };
  if (sessionSnapshot?.planoRecursos?.agenda === false) return { ok: true, permissoes: permissoesNivel, redirectTo: "/meu-plano?motivo=recurso_agenda_bloqueado" };
  const [configRes, profissionaisRes, clientesRes, servicosRes, vinculosServicosRes, comboItensRes, assinaturaRes] = await Promise.all([
    supabase.from("configuracoes_salao").select("cor_primaria, created_at, desconta_taxa_profissional, dias_funcionamento, exigir_cliente_na_venda, fuso_horario, hora_abertura, hora_fechamento, id, id_salao, intervalo_minutos, modo_compacto, permitir_reabrir_venda, repassa_taxa_cliente, taxa_credito_10x, taxa_credito_11x, taxa_credito_12x, taxa_credito_1x, taxa_credito_2x, taxa_credito_3x, taxa_credito_4x, taxa_credito_5x, taxa_credito_6x, taxa_credito_7x, taxa_credito_8x, taxa_credito_9x, taxa_maquininha_boleto, taxa_maquininha_credito, taxa_maquininha_debito, taxa_maquininha_outro, taxa_maquininha_pix, taxa_maquininha_transferencia, updated_at").eq("id_salao", salaoId).maybeSingle(),
    supabase.from("profissionais").select("ativo, bairro, bio, cargo, categoria, cep, cidade, comissao_percentual, comissao_produto_percentual, cor_agenda, cpf, data_admissao, data_nascimento, dias_trabalho, eh_assistente, email, endereco, especialidades, estado, foto, foto_url, id, id_profissional_principal, id_salao, intervalo_agenda_minutos, nivel_acesso, nome, nome_exibicao, nome_social, numero, ordem_agenda, pausas, percentual_comissao_assistente, permite_comissao, pix_chave, pix_tipo, pode_usar_sistema, recebe_comissao, rg, sinal_confirmacao_responsavel, sinal_pix_proprio, sinal_pix_recebedor, sinal_whatsapp, status, telefone, tipo_profissional, tipo_vinculo, whatsapp").eq("id_salao", salaoId).eq("status", "ativo").or("tipo_profissional.is.null,tipo_profissional.eq.profissional").order("nome"),
    supabase.from("clientes").select("id, nome, whatsapp").eq("id_salao", salaoId).order("nome"),
    supabase.from("servicos").select("id, nome, duracao_minutos, preco, preco_padrao, custo_produto, comissao_percentual, comissao_percentual_padrao, comissao_assistente_percentual, base_calculo, desconta_taxa_maquininha, eh_combo, combo_resumo").eq("id_salao", salaoId).eq("status", "ativo").order("nome"),
    supabase.from("profissional_servicos").select("id_profissional, id_servico, ativo").eq("id_salao", salaoId).eq("ativo", true),
    supabase.from("servicos_combo_itens").select("id_servico_combo, id_servico_item, ativo").eq("id_salao", salaoId).eq("ativo", true),
    supabase.from("assinaturas").select("status, vencimento_em, trial_fim_em").eq("id_salao", salaoId).maybeSingle(),
  ]);
  if (configRes.error) console.error("Erro config:", configRes.error); if (profissionaisRes.error) console.error("Erro profissionais:", profissionaisRes.error); if (clientesRes.error) console.error("Erro clientes:", clientesRes.error); if (servicosRes.error) console.error("Erro servicos:", servicosRes.error); if (vinculosServicosRes.error) console.error("Erro vinculos servicos:", vinculosServicosRes.error); if (comboItensRes.error) console.error("Erro itens combo:", comboItensRes.error); if (assinaturaRes.error) console.error("Erro assinatura:", assinaturaRes.error);
  const vinculos = new Map<string, string[]>(); ((vinculosServicosRes.data || []) as { id_servico: string | null; id_profissional: string | null }[]).forEach((v) => { if (!v.id_servico || !v.id_profissional) return; vinculos.set(v.id_servico, [...(vinculos.get(v.id_servico) || []), v.id_profissional]); });
  const combos = new Map<string, string[]>(); ((comboItensRes.data || []) as ComboServicoAgendaRow[]).forEach((i) => { if (!i.id_servico_combo || !i.id_servico_item) return; combos.set(i.id_servico_combo, [...(combos.get(i.id_servico_combo) || []), i.id_servico_item]); });
  const servicos = ((servicosRes.data || []) as Servico[]).map((s) => { const direct = vinculos.get(s.id) || []; const children = combos.get(s.id) || []; const derived = s.eh_combo && children.length ? intersectProfessionalIds(children, vinculos) : []; return { ...s, profissionais_vinculados: derived.length ? derived : direct }; });
  return { ok: true, permissoes: permissoesNivel, idSalao: salaoId, config: (configRes.data as ConfigSalao) || null, profissionais: (profissionaisRes.data as Profissional[]) || [], clientes: (clientesRes.data as Cliente[]) || [], servicos, assinaturaBloqueada: getAssinaturaBloqueada({ status: assinaturaRes.data?.status, vencimentoEm: assinaturaRes.data?.vencimento_em || null, trialFimEm: assinaturaRes.data?.trial_fim_em || null }), erroTela: configRes.data ? "" : "Nao foi possivel carregar as configuracoes do salao." };
}
