export type CursoUsuario = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  data_nascimento: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  responsavel_nome: string | null;
  responsavel_cpf: string | null;
  responsavel_email: string | null;
  responsavel_telefone: string | null;
  responsavel_parentesco: string | null;
  role: "aluno" | "professor" | "admin";
  termo_cadastro_aceito_em: string | null;
};

export type Curso = {
  id: string;
  slug: string;
  nome: string;
  resumo: string;
  descricao: string;
  carga_horaria: number;
  valor_centavos: number;
  imagem_url: string | null;
  ativo: boolean;
  contrato_versao: string | null;
  contrato_conteudo: string | null;
};

export type Turma = {
  id: string;
  curso_id: string;
  nome: string;
  inicio_em: string;
  fim_em: string;
  local: string;
  vagas: number;
  status: "rascunho" | "aberta" | "encerrada";
};

export type MatriculaPainel = {
  id: string;
  status: "pendente" | "confirmada" | "em_andamento" | "concluida" | "cancelada";
  pagamento_status: "pendente" | "pago" | "isento" | "estornado";
  frequencia_percentual: number;
  progresso_percentual: number;
  curso: Curso;
  turma: Turma;
};
