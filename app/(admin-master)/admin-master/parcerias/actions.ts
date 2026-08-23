"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { renderContratoParceria } from "@/lib/parcerias/contrato";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function money(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function criarParceiro(formData: FormData) {
  const access = await requireAdminMasterUser("campanhas_editar");
  const supabase = getSupabaseAdmin() as any;
  const razaoSocial = text(formData, "razao_social");
  if (!razaoSocial) throw new Error("Informe a razão social do parceiro.");

  const payload = {
    razao_social: razaoSocial,
    nome_fantasia: text(formData, "nome_fantasia") || null,
    cpf_cnpj: text(formData, "cpf_cnpj") || null,
    email: text(formData, "email") || null,
    whatsapp: text(formData, "whatsapp") || null,
    segmento: text(formData, "segmento") || null,
    cidade: text(formData, "cidade") || null,
    uf: text(formData, "uf").toUpperCase().slice(0, 2) || null,
    status: "prospect",
    criado_por: access.usuario.id,
  };

  const { data, error } = await supabase.from("parceiros_comerciais").insert(payload).select("id").single();
  if (error) throw new Error(error.message || "Não foi possível criar o parceiro.");

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "criar_parceiro_comercial",
    entidade: "parceiros_comerciais",
    entidadeId: data?.id || null,
    descricao: `Parceiro comercial ${razaoSocial} criado.`,
    payload,
  });

  revalidatePath("/admin-master/parcerias");
}

export async function criarCampanhaParceria(formData: FormData) {
  const access = await requireAdminMasterUser("campanhas_editar");
  const supabase = getSupabaseAdmin() as any;
  const idParceiro = text(formData, "id_parceiro");
  const nome = text(formData, "nome");
  if (!idParceiro || !nome) throw new Error("Selecione o parceiro e informe o nome da campanha.");

  const payload = {
    id_parceiro: idParceiro,
    nome,
    descricao: text(formData, "descricao") || null,
    publico: formData.getAll("publico").map(String),
    locais_exibicao: formData.getAll("locais_exibicao").map(String),
    regioes: { cidade: text(formData, "cidade") || null, uf: text(formData, "uf").toUpperCase().slice(0, 2) || null },
    destino_url: text(formData, "destino_url") || null,
    cupom_codigo: text(formData, "cupom_codigo") || null,
    modelo_cobranca: text(formData, "modelo_cobranca") || "mensal",
    valor_contratado: money(text(formData, "valor_contratado")),
    inicio_em: text(formData, "inicio_em") ? new Date(text(formData, "inicio_em")).toISOString() : null,
    fim_em: text(formData, "fim_em") ? new Date(text(formData, "fim_em")).toISOString() : null,
    status: "aguardando_contrato",
    criado_por: access.usuario.id,
  };

  const { data, error } = await supabase.from("parceria_campanhas").insert(payload).select("id").single();
  if (error) throw new Error(error.message || "Não foi possível criar a campanha de parceria.");

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "criar_campanha_parceria",
    entidade: "parceria_campanhas",
    entidadeId: data?.id || null,
    descricao: `Campanha de parceria ${nome} criada.`,
    payload,
  });

  revalidatePath("/admin-master/parcerias");
}

export async function gerarContratoParceria(formData: FormData) {
  const access = await requireAdminMasterUser("campanhas_editar");
  const supabase = getSupabaseAdmin() as any;
  const idCampanha = text(formData, "id_campanha");
  if (!idCampanha) throw new Error("Campanha não informada.");

  const { data: campanha, error: campanhaError } = await supabase
    .from("parceria_campanhas")
    .select("id,nome,valor_contratado,inicio_em,fim_em,id_parceiro,parceiros_comerciais(razao_social,nome_fantasia,cpf_cnpj,email)")
    .eq("id", idCampanha)
    .single();
  if (campanhaError || !campanha) throw new Error(campanhaError?.message || "Campanha não encontrada.");

  const parceiro = Array.isArray(campanha.parceiros_comerciais) ? campanha.parceiros_comerciais[0] : campanha.parceiros_comerciais;
  const numero = `SP-${new Date().getFullYear()}-${idCampanha.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const conteudo = renderContratoParceria({
    numero,
    parceiroRazaoSocial: parceiro?.razao_social || "Parceiro",
    parceiroNomeFantasia: parceiro?.nome_fantasia,
    parceiroCpfCnpj: parceiro?.cpf_cnpj,
    parceiroEmail: parceiro?.email,
    campanhaNome: campanha.nome,
    valor: Number(campanha.valor_contratado || 0),
    inicioVigencia: campanha.inicio_em ? new Date(campanha.inicio_em).toLocaleDateString("pt-BR") : null,
    fimVigencia: campanha.fim_em ? new Date(campanha.fim_em).toLocaleDateString("pt-BR") : null,
  });
  const hash = createHash("sha256").update(conteudo, "utf8").digest("hex");

  const payload = {
    id_parceiro: campanha.id_parceiro,
    id_campanha: campanha.id,
    numero,
    versao: "1.0",
    conteudo_snapshot: conteudo,
    valor: Number(campanha.valor_contratado || 0),
    inicio_vigencia: campanha.inicio_em ? campanha.inicio_em.slice(0, 10) : null,
    fim_vigencia: campanha.fim_em ? campanha.fim_em.slice(0, 10) : null,
    status: "rascunho",
    hash_documento_sha256: hash,
    signatario_nome: parceiro?.nome_fantasia || parceiro?.razao_social || null,
    signatario_email: parceiro?.email || null,
    criado_por: access.usuario.id,
  };

  const { data, error } = await supabase.from("parceria_contratos").upsert(payload, { onConflict: "numero" }).select("id").single();
  if (error) throw new Error(error.message || "Não foi possível gerar o contrato.");

  await registrarAdminMasterAuditoria({
    idAdmin: access.usuario.id,
    acao: "gerar_contrato_parceria",
    entidade: "parceria_contratos",
    entidadeId: data?.id || null,
    descricao: `Contrato ${numero} gerado com hash SHA-256.`,
    payload: { id_campanha: campanha.id, numero, hash_documento_sha256: hash },
  });

  revalidatePath("/admin-master/parcerias");
}
