import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Curso, CursoUsuario, MatriculaPainel, Turma } from "./types";

// Os tipos definitivos passam a incluir estas tabelas após gerar o schema remoto.
const db = () => getSupabaseAdmin() as any;

function isCursosSchemaMissing(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" && error.message?.includes("cursos_catalogo");
}

export async function listarCursosAbertos() {
  const { data, error } = await db()
    .from("cursos_catalogo")
    .select("id,slug,nome,resumo,descricao,carga_horaria,valor_centavos,imagem_url,ativo,cursos_turmas(id,curso_id,nome,inicio_em,fim_em,local,vagas,status)")
    .eq("ativo", true)
    .eq("cursos_turmas.status", "aberta")
    .order("nome");
  // O catálogo público deve continuar disponível enquanto a migration do
  // portal ainda está sendo aplicada no projeto Supabase.
  if (isCursosSchemaMissing(error)) return [];
  if (error) throw error;
  return (data || []) as unknown as Array<Curso & { cursos_turmas: Turma[] }>;
}

export async function buscarUsuarioPorEmail(email: string) {
  const { data, error } = await db()
    .from("cursos_usuarios")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data as unknown as (CursoUsuario & { password_hash: string }) | null;
}

export async function buscarUsuario(id: string) {
  const { data, error } = await db().from("cursos_usuarios").select("*").eq("id", id).single();
  if (error) throw error;
  return data as unknown as CursoUsuario;
}

export async function listarMatriculasDoAluno(userId: string) {
  const { data, error } = await db()
    .from("cursos_matriculas")
    .select("id,status,pagamento_status,frequencia_percentual,progresso_percentual,curso:cursos_catalogo(*),turma:cursos_turmas(*)")
    .eq("aluno_id", userId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as MatriculaPainel[];
}

export async function buscarMatriculaDoAluno(matriculaId: string, userId: string) {
  const { data, error } = await db()
    .from("cursos_matriculas")
    .select("*,curso:cursos_catalogo(*),turma:cursos_turmas(*),contrato:cursos_contratos(*),certificado:cursos_certificados(*)")
    .eq("id", matriculaId)
    .eq("aluno_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as (MatriculaPainel & { contrato: Record<string, unknown>[]; certificado: Record<string, unknown>[] }) | null;
}

export async function listarConteudoCurso(cursoId: string) {
  const { data, error } = await db()
    .from("cursos_modulos")
    .select("*,materiais:cursos_materiais(*)")
    .eq("curso_id", cursoId)
    .order("ordem");
  if (error) throw error;
  return data || [];
}

export async function resumoAdmin() {
  const [cursos, turmas, matriculas, usuarios] = await Promise.all([
    db().from("cursos_catalogo").select("*", { count: "exact" }).order("criado_em", { ascending: false }),
    db().from("cursos_turmas").select("*,curso:cursos_catalogo(nome)").order("inicio_em"),
    db().from("cursos_matriculas").select("*,aluno:cursos_usuarios(nome,email),curso:cursos_catalogo(nome),turma:cursos_turmas(nome)").order("criado_em", { ascending: false }),
    db().from("cursos_usuarios").select("id", { count: "exact", head: true }),
  ]);
  if (cursos.error) throw cursos.error;
  if (turmas.error) throw turmas.error;
  if (matriculas.error) throw matriculas.error;
  return {
    cursos: cursos.data || [],
    turmas: turmas.data || [],
    matriculas: matriculas.data || [],
    totalAlunos: usuarios.count || 0,
  };
}
