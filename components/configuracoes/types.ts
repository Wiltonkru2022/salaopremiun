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
