"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buscarUsuarioPorEmail } from "@/lib/cursos/data";
import { clearCursoSession, createCursoSession, emailPodeAdministrar, readCursoSession } from "@/lib/cursos/session";

const cursosDb = () => getSupabaseAdmin() as any;

const digits = (value: FormDataEntryValue | null) => String(value || "").replace(/\D/g, "");
const text = (form: FormData, key: string) => String(form.get(key) || "").trim();

function fail(path: string, message: string): never {
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

const cadastroSchema = z.object({
  nome: z.string().min(3),
  email: z.email(),
  cpf: z.string().length(11),
  telefone: z.string().min(10),
  dataNascimento: z.string().min(10),
  cep: z.string().length(8),
  endereco: z.string().min(3),
  numero: z.string().min(1),
  bairro: z.string().min(2),
  cidade: z.string().min(2),
  estado: z.string().length(2),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
});

function idadeEmAnos(dataNascimento: string) {
  const nascimento = new Date(`${dataNascimento}T12:00:00`);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aniversarioPassou = hoje.getMonth() > nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() >= nascimento.getDate());
  if (!aniversarioPassou) idade -= 1;
  return idade;
}

export async function cadastrarAluno(form: FormData) {
  const parsed = cadastroSchema.safeParse({
    nome: text(form, "nome"), email: text(form, "email").toLowerCase(), cpf: digits(form.get("cpf")),
    telefone: digits(form.get("telefone")), dataNascimento: text(form, "data_nascimento"), cep: digits(form.get("cep")),
    endereco: text(form, "endereco"), numero: text(form, "numero"), bairro: text(form, "bairro"),
    cidade: text(form, "cidade"), estado: text(form, "estado").toUpperCase(), password: text(form, "password"),
  });
  if (!parsed.success) fail("/cursos/cadastro", "Revise os campos obrigatórios. A senha precisa ter 8 caracteres, letras e números.");
  if (form.get("privacidade") !== "on" || form.get("termos") !== "on") fail("/cursos/cadastro", "É necessário aceitar os Termos e a Política de Privacidade.");
  if (text(form, "password") !== text(form, "confirm_password")) fail("/cursos/cadastro", "As senhas não coincidem.");

  const menor = idadeEmAnos(parsed.data.dataNascimento) < 18;
  const responsavelNome = text(form, "responsavel_nome");
  const responsavelCpf = digits(form.get("responsavel_cpf"));
  if (menor && (responsavelNome.length < 3 || responsavelCpf.length !== 11)) fail("/cursos/cadastro", "Para menores de 18 anos, informe nome e CPF do responsável.");

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const role = emailPodeAdministrar(parsed.data.email) ? "admin" : "aluno";
  const { data, error } = await cursosDb().from("cursos_usuarios").insert({
    nome: parsed.data.nome, email: parsed.data.email, cpf: parsed.data.cpf, telefone: parsed.data.telefone,
    data_nascimento: parsed.data.dataNascimento, cep: parsed.data.cep, endereco: parsed.data.endereco,
    numero: parsed.data.numero, complemento: text(form, "complemento") || null, bairro: parsed.data.bairro,
    cidade: parsed.data.cidade, estado: parsed.data.estado, password_hash: passwordHash,
    responsavel_nome: menor ? responsavelNome : null, responsavel_cpf: menor ? responsavelCpf : null,
    responsavel_email: menor ? text(form, "responsavel_email").toLowerCase() : null,
    responsavel_telefone: menor ? digits(form.get("responsavel_telefone")) : null,
    responsavel_parentesco: menor ? text(form, "responsavel_parentesco") : null,
    marketing_aceito: form.get("marketing") === "on", imagem_aceita: form.get("imagem") === "on",
    role,
  }).select("id,email,role").single();
  if (error) {
    if (error.code === "23505") fail("/cursos/cadastro", "Já existe uma conta com este e-mail ou CPF.");
    fail("/cursos/cadastro", "Não foi possível criar a conta agora. Tente novamente.");
  }
  await createCursoSession({ userId: String(data.id), email: String(data.email), role });
  redirect("/cursos/contrato");
}

export async function entrarCursos(form: FormData) {
  const email = text(form, "email").toLowerCase();
  const password = text(form, "password");
  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) fail("/cursos/login", "E-mail ou senha inválidos.");
  const role = emailPodeAdministrar(email) ? "admin" : usuario.role;
  await createCursoSession({ userId: usuario.id, email: usuario.email, role });
  redirect(role === "admin" || role === "professor" ? "/admin-cursos" : "/meuscursos");
}

export async function sairCursos() {
  await clearCursoSession();
  redirect("/cursos");
}

export async function aceitarTermoCadastro(form: FormData) {
  const session = await readCursoSession();
  if (!session) redirect("/cursos/login");
  const assinatura = text(form, "assinatura");
  if (assinatura.length < 3 || form.get("aceite") !== "on") fail("/cursos/contrato", "Digite o nome completo e confirme o aceite.");
  const agora = new Date().toISOString();
  const { error } = await cursosDb().from("cursos_usuarios").update({
    termo_cadastro_aceito_em: agora, termo_cadastro_assinatura: assinatura, termo_cadastro_versao: "1.0",
  }).eq("id", session.userId);
  if (error) fail("/cursos/contrato", "Não foi possível registrar o aceite.");
  redirect(emailPodeAdministrar(session.email) ? "/admin-cursos" : "/meuscursos");
}

export async function matricularSe(form: FormData) {
  const session = await readCursoSession();
  if (!session) redirect("/cursos/login");
  const turmaId = text(form, "turma_id");
  const { data: turma } = await cursosDb().from("cursos_turmas").select("id,curso_id,status,vagas").eq("id", turmaId).eq("status", "aberta").single();
  if (!turma) fail("/meuscursos", "Turma indisponível.");
  const { count } = await cursosDb().from("cursos_matriculas").select("id", { count: "exact", head: true }).eq("turma_id", turmaId).neq("status", "cancelada");
  if ((count || 0) >= Number(turma.vagas)) fail("/meuscursos", "Esta turma já está lotada.");
  const { data: matricula, error } = await cursosDb().from("cursos_matriculas").insert({
    aluno_id: session.userId, curso_id: turma.curso_id, turma_id: turma.id, status: "pendente",
  }).select("id").single();
  if (error) {
    if (error.code === "23505") fail("/meuscursos", "Você já está matriculada nesta turma.");
    fail("/meuscursos", "Não foi possível realizar a matrícula.");
  }
  redirect(`/meuscursos/${matricula.id}/contrato`);
}

export async function aceitarContratoMatricula(form: FormData) {
  const session = await readCursoSession();
  if (!session) redirect("/cursos/login");
  const matriculaId = text(form, "matricula_id");
  const assinatura = text(form, "assinatura");
  if (assinatura.length < 3 || form.get("aceite") !== "on") fail(`/meuscursos/${matriculaId}/contrato`, "Confirme o aceite e digite o nome completo.");
  const { data: matricula } = await cursosDb().from("cursos_matriculas").select("id,aluno_id,curso_id,turma_id,curso:cursos_catalogo(contrato_versao,contrato_conteudo)").eq("id", matriculaId).eq("aluno_id", session.userId).single();
  if (!matricula) redirect("/meuscursos");
  const curso = Array.isArray(matricula.curso) ? matricula.curso[0] : matricula.curso;
  if (!curso?.contrato_conteudo || !curso?.contrato_versao) fail(`/meuscursos/${matriculaId}/contrato`, "O contrato deste curso ainda não foi publicado.");
  const agora = new Date().toISOString();
  const { error } = await cursosDb().from("cursos_contratos").upsert({
    matricula_id: matricula.id, versao: curso.contrato_versao, assinatura_nome: assinatura, assinado_em: agora,
    conteudo_snapshot: curso.contrato_conteudo,
  }, { onConflict: "matricula_id" });
  if (error) fail(`/meuscursos/${matriculaId}/contrato`, "Não foi possível registrar a assinatura.");
  await cursosDb().from("cursos_matriculas").update({ status: "confirmada", contrato_aceito_em: agora }).eq("id", matricula.id);
  redirect(`/meuscursos/${matricula.id}/painel`);
}

export async function criarCurso(form: FormData) {
  const session = await readCursoSession();
  if (!session || !(session.role === "admin" || emailPodeAdministrar(session.email))) redirect("/admin-cursos/login");
  const nome = text(form, "nome");
  const slug = text(form, "slug").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const { error } = await cursosDb().from("cursos_catalogo").insert({
    nome, slug, resumo: text(form, "resumo"), descricao: text(form, "descricao"),
    carga_horaria: Number(text(form, "carga_horaria") || 0), valor_centavos: Math.round(Number(text(form, "valor")) * 100), ativo: true,
    contrato_versao: text(form, "contrato_versao"), contrato_conteudo: text(form, "contrato_conteudo"),
  });
  if (error) fail("/admin-cursos", "Não foi possível criar o curso.");
  revalidatePath("/admin-cursos"); revalidatePath("/cursos");
}

export async function atualizarContratoCurso(form: FormData) {
  const session = await readCursoSession();
  if (!session || !(session.role === "admin" || emailPodeAdministrar(session.email))) redirect("/admin-cursos/login");
  const cursoId = text(form, "curso_id");
  const versao = text(form, "contrato_versao");
  const conteudo = text(form, "contrato_conteudo");
  if (!cursoId || !versao || conteudo.length < 50) fail("/admin-cursos", "Informe a versão e um contrato completo com pelo menos 50 caracteres.");
  const { error } = await cursosDb().from("cursos_catalogo").update({ contrato_versao: versao, contrato_conteudo: conteudo }).eq("id", cursoId);
  if (error) fail("/admin-cursos", "Não foi possível atualizar o contrato do curso.");
  revalidatePath("/admin-cursos");
}

export async function criarTurma(form: FormData) {
  const session = await readCursoSession();
  if (!session || !(session.role === "admin" || emailPodeAdministrar(session.email))) redirect("/admin-cursos/login");
  const { error } = await cursosDb().from("cursos_turmas").insert({
    curso_id: text(form, "curso_id"), nome: text(form, "nome"), inicio_em: text(form, "inicio_em"),
    fim_em: text(form, "fim_em"), local: text(form, "local"), vagas: Number(text(form, "vagas") || 1), status: "aberta",
  });
  if (error) fail("/admin-cursos", "Não foi possível abrir a turma.");
  revalidatePath("/admin-cursos"); revalidatePath("/cursos"); revalidatePath("/meuscursos");
}

export async function adicionarMaterial(form: FormData) {
  const session = await readCursoSession();
  if (!session || !(session.role === "admin" || session.role === "professor" || emailPodeAdministrar(session.email))) redirect("/admin-cursos/login");
  const cursoId = text(form, "curso_id");
  const tituloModulo = text(form, "modulo");
  let moduloId = text(form, "modulo_id");
  if (!moduloId) {
    const { data } = await cursosDb().from("cursos_modulos").insert({ curso_id: cursoId, titulo: tituloModulo, ordem: Number(text(form, "ordem") || 1) }).select("id").single();
    moduloId = String(data?.id || "");
  }
  if (!moduloId) fail("/admin-cursos", "Informe ou crie um módulo.");
  const file = form.get("arquivo");
  let storagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 25 * 1024 * 1024) fail("/admin-cursos", "O arquivo deve ter no máximo 25 MB.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    storagePath = `${cursoId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await cursosDb().storage.from("cursos-materiais").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) fail("/admin-cursos", "Falha ao enviar o arquivo.");
  }
  const url = text(form, "url") || null;
  if (!storagePath && !url) fail("/admin-cursos", "Envie um arquivo ou informe a URL do vídeo.");
  const { error } = await cursosDb().from("cursos_materiais").insert({
    modulo_id: moduloId, titulo: text(form, "titulo"), tipo: storagePath ? "arquivo" : "video", storage_path: storagePath, url_externa: url,
  });
  if (error) fail("/admin-cursos", "Não foi possível salvar o material.");
  revalidatePath("/admin-cursos");
}

export async function atualizarMatricula(form: FormData) {
  const session = await readCursoSession();
  if (!session || !(session.role === "admin" || session.role === "professor" || emailPodeAdministrar(session.email))) redirect("/admin-cursos/login");
  const id = text(form, "matricula_id");
  const status = text(form, "status");
  const frequencia = Math.min(100, Math.max(0, Number(text(form, "frequencia") || 0)));
  const pagamento = text(form, "pagamento_status");
  const concluida = status === "concluida";
  const { error } = await cursosDb().from("cursos_matriculas").update({
    status, pagamento_status: pagamento, frequencia_percentual: frequencia,
    progresso_percentual: concluida ? 100 : Number(text(form, "progresso") || 0), concluido_em: concluida ? new Date().toISOString() : null,
  }).eq("id", id);
  if (error) fail("/admin-cursos", "Não foi possível atualizar a matrícula.");
  if (concluida) {
    const codigo = `SPC-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await cursosDb().from("cursos_certificados").upsert({ matricula_id: id, codigo, emitido_em: new Date().toISOString() }, { onConflict: "matricula_id", ignoreDuplicates: true });
  }
  revalidatePath("/admin-cursos"); revalidatePath("/meuscursos");
}
