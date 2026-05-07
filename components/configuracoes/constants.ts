import type { UserNivel } from "@/lib/permissions";
import type { ConfigSalaoForm, RateioConfig, SalaoForm, UsuarioForm } from "./types";

export const DIAS_SEMANA = [
  { value: "segunda", label: "Segunda" },
  { value: "terca", label: "Terça" },
  { value: "quarta", label: "Quarta" },
  { value: "quinta", label: "Quinta" },
  { value: "sexta", label: "Sexta" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

export const NIVEIS_USUARIO: { value: UserNivel; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "gerente", label: "Gerente" },
  { value: "recepcao", label: "Recepção" },
  { value: "profissional", label: "Profissional" },
];

export const EMPTY_SALAO: SalaoForm = {
  id: "",
  nome: "",
  responsavel: "",
  email: "",
  telefone: "",
  cpf_cnpj: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  logo_url: "",
  plano: "",
  status: "",
  descricao_publica: "",
  foto_capa_url: "",
  latitude: "",
  longitude: "",
  estacionamento: false,
  formas_pagamento_publico: "",
  app_cliente_publicado: false,
};

export const RATEIO_CONFIG_DEFAULT: RateioConfig = {
  mostrar_cliente: true,
  mostrar_data: true,
  mostrar_servicos: true,
  mostrar_custo_produtos: false,
  mostrar_taxa_maquininha: true,
  mostrar_acrescimo_desconto: true,
  mostrar_assistente: true,
  mostrar_pessoa: true,
  mostrar_descricao: true,
  mostrar_competencia: true,
  mostrar_base: true,
  mostrar_percentual: true,
  mostrar_origem: true,
  mostrar_comissao: true,
  mostrar_status: true,
  mostrar_pago_em: true,
};

export const EMPTY_CONFIG: ConfigSalaoForm = {
  id: "",
  id_salao: "",
  hora_abertura: "08:00",
  hora_fechamento: "19:00",
  intervalo_minutos: 15,
  dias_funcionamento: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
  taxa_maquininha_credito: 0,
  taxa_maquininha_debito: 0,
  taxa_maquininha_pix: 0,
  taxa_credito_1x: 0,
  taxa_credito_2x: 0,
  taxa_credito_3x: 0,
  taxa_credito_4x: 0,
  taxa_credito_5x: 0,
  taxa_credito_6x: 0,
  taxa_credito_7x: 0,
  taxa_credito_8x: 0,
  taxa_credito_9x: 0,
  taxa_credito_10x: 0,
  taxa_credito_11x: 0,
  taxa_credito_12x: 0,
  repassa_taxa_cliente: false,
  desconta_taxa_profissional: false,
  permitir_reabrir_venda: true,
  exigir_cliente_na_venda: false,
  cor_primaria: "#18181b",
  modo_compacto: false,
  rateio_config: RATEIO_CONFIG_DEFAULT,
};

export const EMPTY_USUARIO_FORM: UsuarioForm = {
  id: "",
  nome: "",
  email: "",
  nivel: "recepcao",
  senha: "",
  status: "ativo",
};
