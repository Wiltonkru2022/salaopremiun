export type ProfissionalCliente = {
  id: string;
  nome: string;
};

export type ClienteFormProps = {
  modo: "novo" | "editar";
};

export type ClienteState = {
  id?: string;
  id_salao: string;
  nome: string;
  nome_social: string;
  data_nascimento: string;
  whatsapp: string;
  telefone: string;
  email: string;
  cpf: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  profissao: string;
  observacoes: string;
  foto_url: string;
  status: string;
  ativo: boolean;
};

export type FichaTecnicaCliente = {
  alergias: string;
  historico_quimico: string;
  condicoes_couro_cabeludo_pele: string;
  uso_medicamentos: string;
  gestante: boolean;
  lactante: boolean;
  restricoes_quimicas: string;
  observacoes_tecnicas: string;
};

export type PreferenciasCliente = {
  bebida_favorita: string;
  estilo_atendimento: string;
  revistas_assuntos_preferidos: string;
  como_conheceu_salao: string;
  profissional_favorito_id: string;
  frequencia_visitas: string;
  preferencias_gerais: string;
};

export type AutorizacoesCliente = {
  autoriza_uso_imagem: boolean;
  autoriza_whatsapp_marketing: boolean;
  autoriza_email_marketing: boolean;
  termo_lgpd_aceito: boolean;
  observacoes_autorizacao: string;
};

export type ClienteAuthState = {
  email: string;
  senha_hash: string;
  app_ativo: boolean;
};

export type ClientePayload = {
  id?: string | null;
  id_salao: string;
  nome: string;
  nome_social?: string | null;
  data_nascimento?: string | null;
  whatsapp?: string | null;
  telefone?: string | null;
  email?: string | null;
  cpf?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  profissao?: string | null;
  observacoes?: string | null;
  foto_url?: string | null;
  status?: string | null;
  ativo?: boolean;
};

export type ClienteFichaPayload = {
  id_salao: string;
  id_cliente?: string | null;
  alergias?: string | null;
  historico_quimico?: string | null;
  condicoes_couro_cabeludo_pele?: string | null;
  uso_medicamentos?: string | null;
  gestante?: boolean;
  lactante?: boolean;
  restricoes_quimicas?: string | null;
  observacoes_tecnicas?: string | null;
};

export type ClientePreferenciasPayload = {
  id_salao: string;
  id_cliente?: string | null;
  bebida_favorita?: string | null;
  estilo_atendimento?: string | null;
  revistas_assuntos_preferidos?: string | null;
  como_conheceu_salao?: string | null;
  profissional_favorito_id?: string | null;
  frequencia_visitas?: string | null;
  preferencias_gerais?: string | null;
};

export type ClienteAutorizacoesPayload = {
  id_salao: string;
  id_cliente?: string | null;
  autoriza_uso_imagem?: boolean;
  autoriza_whatsapp_marketing?: boolean;
  autoriza_email_marketing?: boolean;
  termo_lgpd_aceito?: boolean;
  data_aceite_lgpd?: string | null;
  observacoes_autorizacao?: string | null;
};

export type ClienteAuthPayload = {
  id_salao: string;
  id_cliente?: string | null;
  email?: string | null;
  senha_hash?: string | null;
  app_ativo?: boolean;
};

export type ClienteProcessarBody = {
  idSalao?: string | null;
  acao?: "salvar" | "alterar_status" | "excluir" | null;
  cliente?: ClientePayload | null;
  ficha?: ClienteFichaPayload | null;
  preferencias?: ClientePreferenciasPayload | null;
  autorizacoes?: ClienteAutorizacoesPayload | null;
  auth?: ClienteAuthPayload | null;
};

export type ClienteProcessarResponse = {
  ok: boolean;
  idCliente?: string | null;
  ativo?: boolean | null;
  status?: string | null;
};

export type ClienteProcessarErrorResponse = {
  error?: string;
};
