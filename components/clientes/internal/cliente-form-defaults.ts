import type {
  AutorizacoesCliente,
  ClienteAuthState,
  ClienteState,
  FichaTecnicaCliente,
  PreferenciasCliente,
} from "@/types/clientes";

export const initialCliente: ClienteState = {
  id_salao: "",
  nome: "",
  nome_social: "",
  cashback: 0,
  data_nascimento: "",
  whatsapp: "",
  telefone: "",
  email: "",
  cpf: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  profissao: "",
  observacoes: "",
  foto_url: "",
  status: "ativo",
  ativo: true,
};

export const initialFicha: FichaTecnicaCliente = {
  alergias: "",
  historico_quimico: "",
  condicoes_couro_cabeludo_pele: "",
  uso_medicamentos: "",
  gestante: false,
  lactante: false,
  restricoes_quimicas: "",
  observacoes_tecnicas: "",
};

export const initialPreferencias: PreferenciasCliente = {
  bebida_favorita: "",
  estilo_atendimento: "",
  revistas_assuntos_preferidos: "",
  como_conheceu_salao: "",
  profissional_favorito_id: "",
  frequencia_visitas: "",
  preferencias_gerais: "",
};

export const initialAutorizacoes: AutorizacoesCliente = {
  autoriza_uso_imagem: false,
  autoriza_whatsapp_marketing: false,
  autoriza_email_marketing: false,
  termo_lgpd_aceito: false,
  observacoes_autorizacao: "",
};

export const initialAuth: ClienteAuthState = {
  email: "",
  senha_hash: "",
  app_ativo: false,
};
