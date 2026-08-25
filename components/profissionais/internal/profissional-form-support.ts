export type Servico = {
  id: string;
  nome: string;
  duracao_minutos?: number | null;
  preco?: number | null;
};

export type ProfissionalServico = {
  id_servico: string;
  duracao_minutos: string;
  ativo: boolean;
};

export type DiaTrabalho = {
  dia: string;
  ativo: boolean;
  inicio: string;
  fim: string;
};

export type AssistenteOption = {
  id: string;
  nome: string;
  nome_social?: string | null;
  categoria?: string | null;
  cargo?: string | null;
  foto_url?: string | null;
  status?: string | null;
  ativo?: boolean | null;
  tipo_profissional?: string | null;
};

export type Profissional = {
  id?: string;
  id_salao: string;
  nome: string;
  nome_social: string;
  foto_url: string;
  categoria: string;
  cargo: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  especialidades: string[];
  data_admissao: string;
  bio: string;
  tipo_profissional: string;
  tipo_vinculo: string;
  comissao_produto_percentual: string;
  pix_tipo: string;
  pix_chave: string;
  intervalo_agenda_minutos: string;
  sinal_pix_proprio: boolean;
  sinal_pix_recebedor: string;
  sinal_whatsapp: string;
  sinal_confirmacao_responsavel: string;
  nivel_acesso: string;
  status: string;
  ativo: boolean;
  dias_trabalho: DiaTrabalho[];
};

export type ProfissionalAcesso = {
  ativo: boolean;
  cpf: string;
  senha: string;
  possuiCadastro: boolean;
};

export type ProfissionalServicoRow = {
  id_servico: string;
  duracao_minutos?: number | string | null;
  ativo?: boolean | null;
};

export type ProfissionalAssistenteRow = {
  id_assistente: string;
};

export const DIAS_FIXOS: DiaTrabalho[] = [
  { dia: "Segunda", ativo: false, inicio: "09:00", fim: "18:00" },
  { dia: "Terça", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "Quarta", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "Quinta", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "Sexta", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "Sábado", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "Domingo", ativo: false, inicio: "09:00", fim: "18:00" },
];

export const initialForm: Profissional = {
  id_salao: "",
  nome: "",
  nome_social: "",
  foto_url: "",
  categoria: "",
  cargo: "",
  cpf: "",
  rg: "",
  data_nascimento: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  especialidades: [],
  data_admissao: "",
  bio: "",
  tipo_profissional: "profissional",
  tipo_vinculo: "AUTONOMO",
  comissao_produto_percentual: "0",
  pix_tipo: "CPF",
  pix_chave: "",
  intervalo_agenda_minutos: "30",
  sinal_pix_proprio: false,
  sinal_pix_recebedor: "",
  sinal_whatsapp: "",
  sinal_confirmacao_responsavel: "salao",
  nivel_acesso: "proprio",
  status: "ativo",
  ativo: true,
  dias_trabalho: DIAS_FIXOS,
};
export const initialAcesso: ProfissionalAcesso = {
  ativo: false,
  cpf: "",
  senha: "",
  possuiCadastro: false,
};

export const FOTO_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const FOTO_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

export function validarFotoProfissional(file: File) {
  if (!FOTO_ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Envie uma foto JPG, PNG, WEBP ou GIF.");
  }

  if (file.size > FOTO_MAX_FILE_SIZE) {
    throw new Error("A foto precisa ter ate 5MB.");
  }
}

export function isDiaTrabalho(value: unknown): value is DiaTrabalho {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.dia === "string" &&
    typeof item.ativo === "boolean" &&
    typeof item.inicio === "string" &&
    typeof item.fim === "string"
  );
}
