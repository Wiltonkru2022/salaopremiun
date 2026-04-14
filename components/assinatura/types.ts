export type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

export type CardForm = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type SalaoRow = {
  id: string;
  nome: string | null;
  email?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
  responsavel?: string | null;
  cep?: string | null;
  numero?: string | null;
  complemento?: string | null;
  created_at: string | null;
};

export type AssinaturaRow = {
  id: string;
  id_salao: string;
  plano: string | null;
  status: string | null;
  valor: number | null;
  created_at: string | null;
  pago_em: string | null;
  vencimento_em: string | null;
  trial_ativo: boolean | null;
  trial_inicio_em: string | null;
  trial_fim_em: string | null;
  limite_profissionais: number | null;
  limite_usuarios: number | null;
  asaas_customer_id?: string | null;
  asaas_payment_id?: string | null;
  gateway?: string | null;
  forma_pagamento_atual?: string | null;
  renovacao_automatica?: boolean | null;
};

export type CheckoutResponse = {
  ok: boolean;
  customerId: string;
  paymentId: string;
  valor: number;
  plano: string;
  billingType: BillingType;
  status?: string;
  qrCodeBase64?: string | null;
  pixCopiaCola?: string | null;
  vencimento: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  error?: string;
};

export type UsuarioSupabase = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export type Permissoes = Record<string, boolean>;

export const PLANOS_INFO: Record<
  string,
  {
    nome: string;
    valor: number;
    descricao: string;
    recursos: string[];
    ordem: number;
  }
> = {
  basico: {
    nome: "Básico",
    valor: 49.9,
    descricao: "Ideal para salão pequeno",
    recursos: ["3 profissionais", "2 usuários", "Agenda e caixa"],
    ordem: 1,
  },
  pro: {
    nome: "Pro",
    valor: 89.9,
    descricao: "Mais recursos e mais equipe",
    recursos: ["10 profissionais", "5 usuários", "Operação completa"],
    ordem: 2,
  },
  premium: {
    nome: "Premium",
    valor: 149.9,
    descricao: "Plano completo sem limites práticos",
    recursos: [
      "Profissionais ilimitados",
      "Usuários ilimitados",
      "Tudo liberado",
    ],
    ordem: 3,
  },
  teste_gratis: {
    nome: "Teste grátis",
    valor: 0,
    descricao: "Período de teste",
    recursos: [
      "Acesso temporário",
      "Teste da operação",
      "Sem cobrança no período",
    ],
    ordem: 0,
  },
};

export type TipoMovimentoAssinatura =
  | "upgrade"
  | "downgrade"
  | "renovacao";

export type HistoricoCobrancaRow = {
  id: string;
  referencia?: string | null;
  valor?: number | null;
  status?: string | null;
  forma_pagamento?: string | null;
  data_expiracao?: string | null;
  payment_date?: string | null;
  confirmed_date?: string | null;
  invoice_url?: string | null;
  bank_slip_url?: string | null;
  created_at?: string | null;
  descricao?: string | null;
  plano_origem?: string | null;
  plano_destino?: string | null;
  tipo_movimento?: TipoMovimentoAssinatura | null;
  gerada_automaticamente?: boolean | null;
};