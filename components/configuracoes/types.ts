import type { UserNivel } from "@/lib/permissions";

export type SalaoForm = {
  id: string;
  nome: string;
  responsavel: string;
  email: string;
  telefone: string;
  cpf_cnpj: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  logo_url: string;
  plano?: string | null;
  status?: string | null;
  descricao_publica?: string;
  foto_capa_url?: string;
  latitude?: string;
  longitude?: string;
  estacionamento?: boolean;
  formas_pagamento_publico?: string;
  app_cliente_publicado?: boolean;
  app_cliente_pausado?: boolean;
  app_cliente_pausa_mensagem?: string;
  app_cliente_slug?: string;
};

export type ConfigSalaoForm = {
  id: string;
  id_salao: string;
  hora_abertura: string;
  hora_fechamento: string;
  intervalo_minutos: number;
  dias_funcionamento: string[];
  taxa_maquininha_credito: number;
  taxa_maquininha_debito: number;
  taxa_maquininha_pix: number;
  repassa_taxa_cliente: boolean;
  desconta_taxa_profissional: boolean;
  permitir_reabrir_venda: boolean;
  exigir_cliente_na_venda: boolean;
  cor_primaria: string;
  modo_compacto: boolean;
  taxa_credito_1x: number;
  taxa_credito_2x: number;
  taxa_credito_3x: number;
  taxa_credito_4x: number;
  taxa_credito_5x: number;
  taxa_credito_6x: number;
  taxa_credito_7x: number;
  taxa_credito_8x: number;
  taxa_credito_9x: number;
  taxa_credito_10x: number;
  taxa_credito_11x: number;
  taxa_credito_12x: number;
  rateio_config: RateioConfig;
};

export type RateioConfig = {
  mostrar_cliente: boolean;
  mostrar_data: boolean;
  mostrar_servicos: boolean;
  mostrar_custo_produtos: boolean;
  mostrar_taxa_maquininha: boolean;
  mostrar_acrescimo_desconto: boolean;
  mostrar_assistente: boolean;
  mostrar_pessoa: boolean;
  mostrar_descricao: boolean;
  mostrar_competencia: boolean;
  mostrar_base: boolean;
  mostrar_percentual: boolean;
  mostrar_origem: boolean;
  mostrar_comissao: boolean;
  mostrar_status: boolean;
  mostrar_pago_em: boolean;
};

export type UsuarioSistema = {
  id: string;
  id_salao: string;
  nome: string;
  email: string;
  nivel: UserNivel | string;
  status: string;
  auth_user_id?: string | null;
  created_at?: string | null;
};

export type UsuarioForm = {
  id: string;
  nome: string;
  email: string;
  nivel: UserNivel;
  senha: string;
  status: string;
};
