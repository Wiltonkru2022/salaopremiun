import type { Database, Json } from "./database.generated";

type WhatsappPacoteComprasTable = {
  Row: {
    id: string;
    id_salao: string;
    id_pacote: string;
    status: string;
    billing_type: string;
    valor: number;
    quantidade_creditos: number;
    idempotency_key: string | null;
    external_reference: string;
    asaas_customer_id: string | null;
    asaas_payment_id: string | null;
    invoice_url: string | null;
    bank_slip_url: string | null;
    pix_copia_cola: string | null;
    qr_code_base64: string | null;
    response_json: Json;
    pago_em: string | null;
    criado_em: string;
    atualizado_em: string;
  };
  Insert: {
    id?: string;
    id_salao: string;
    id_pacote: string;
    status?: string;
    billing_type?: string;
    valor?: number;
    quantidade_creditos?: number;
    idempotency_key?: string | null;
    external_reference: string;
    asaas_customer_id?: string | null;
    asaas_payment_id?: string | null;
    invoice_url?: string | null;
    bank_slip_url?: string | null;
    pix_copia_cola?: string | null;
    qr_code_base64?: string | null;
    response_json?: Json;
    pago_em?: string | null;
    criado_em?: string;
    atualizado_em?: string;
  };
  Update: {
    id?: string;
    id_salao?: string;
    id_pacote?: string;
    status?: string;
    billing_type?: string;
    valor?: number;
    quantidade_creditos?: number;
    idempotency_key?: string | null;
    external_reference?: string;
    asaas_customer_id?: string | null;
    asaas_payment_id?: string | null;
    invoice_url?: string | null;
    bank_slip_url?: string | null;
    pix_copia_cola?: string | null;
    qr_code_base64?: string | null;
    response_json?: Json;
    pago_em?: string | null;
    criado_em?: string;
    atualizado_em?: string;
  };
  Relationships: [
    {
      foreignKeyName: "whatsapp_pacote_compras_id_pacote_fkey";
      columns: ["id_pacote"];
      isOneToOne: false;
      referencedRelation: "whatsapp_pacotes";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "whatsapp_pacote_compras_id_salao_fkey";
      columns: ["id_salao"];
      isOneToOne: false;
      referencedRelation: "saloes";
      referencedColumns: ["id"];
    },
  ];
};

type ServicosTableExtensions = {
  Row: {
    eh_combo: boolean | null;
    combo_resumo: string | null;
  };
  Insert: {
    eh_combo?: boolean | null;
    combo_resumo?: string | null;
  };
  Update: {
    eh_combo?: boolean | null;
    combo_resumo?: string | null;
  };
};

type ServicosComboItensTable = {
  Row: {
    ativo: boolean;
    created_at: string | null;
    id: string;
    id_salao: string;
    id_servico_combo: string;
    id_servico_item: string;
    ordem: number | null;
    percentual_rateio: number | null;
    preco_base: number | null;
    updated_at: string | null;
  };
  Insert: {
    ativo?: boolean;
    created_at?: string | null;
    id?: string;
    id_salao: string;
    id_servico_combo: string;
    id_servico_item: string;
    ordem?: number | null;
    percentual_rateio?: number | null;
    preco_base?: number | null;
    updated_at?: string | null;
  };
  Update: {
    ativo?: boolean;
    created_at?: string | null;
    id?: string;
    id_salao?: string;
    id_servico_combo?: string;
    id_servico_item?: string;
    ordem?: number | null;
    percentual_rateio?: number | null;
    preco_base?: number | null;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "servicos_combo_itens_id_salao_fkey";
      columns: ["id_salao"];
      isOneToOne: false;
      referencedRelation: "saloes";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "servicos_combo_itens_id_servico_combo_fkey";
      columns: ["id_servico_combo"];
      isOneToOne: false;
      referencedRelation: "servicos";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "servicos_combo_itens_id_servico_item_fkey";
      columns: ["id_servico_item"];
      isOneToOne: false;
      referencedRelation: "servicos";
      referencedColumns: ["id"];
    }
  ];
};

type SaloesRecursosExtrasTableExtensions = {
  Row: {
    limite_numero: number | null;
  };
  Insert: {
    limite_numero?: number | null;
  };
  Update: {
    limite_numero?: number | null;
  };
};

type SaloesSecurityTableExtensions = {
  Row: {
    status_seguranca: string | null;
    motivo_seguranca: string | null;
    bloqueado_ate: string | null;
  };
  Insert: {
    status_seguranca?: string | null;
    motivo_seguranca?: string | null;
    bloqueado_ate?: string | null;
  };
  Update: {
    status_seguranca?: string | null;
    motivo_seguranca?: string | null;
    bloqueado_ate?: string | null;
  };
};

type UserSecurityStatusTable = {
  Row: {
    user_id: string;
    tipo_usuario: string;
    status: string;
    motivo: string | null;
    risco_atual: string;
    bloqueado_ate: string | null;
    verificacao_necessaria: boolean;
    criado_em: string;
    atualizado_em: string;
  };
  Insert: {
    user_id: string;
    tipo_usuario: string;
    status?: string;
    motivo?: string | null;
    risco_atual?: string;
    bloqueado_ate?: string | null;
    verificacao_necessaria?: boolean;
    criado_em?: string;
    atualizado_em?: string;
  };
  Update: {
    user_id?: string;
    tipo_usuario?: string;
    status?: string;
    motivo?: string | null;
    risco_atual?: string;
    bloqueado_ate?: string | null;
    verificacao_necessaria?: boolean;
    criado_em?: string;
    atualizado_em?: string;
  };
  Relationships: [];
};

type SecurityLoginAttemptsTable = {
  Row: {
    id: string;
    tipo_usuario: string;
    user_id: string | null;
    id_salao: string | null;
    identidade: string | null;
    ip: string | null;
    user_agent: string | null;
    risco: string;
    criado_em: string;
  };
  Insert: {
    id?: string;
    tipo_usuario: string;
    user_id?: string | null;
    id_salao?: string | null;
    identidade?: string | null;
    ip?: string | null;
    user_agent?: string | null;
    risco?: string;
    criado_em?: string;
  };
  Update: {
    id?: string;
    tipo_usuario?: string;
    user_id?: string | null;
    id_salao?: string | null;
    identidade?: string | null;
    ip?: string | null;
    user_agent?: string | null;
    risco?: string;
    criado_em?: string;
  };
  Relationships: [];
};

type ClientesAppAuthTable = {
  Row: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    senha_hash: string;
    preferencias_gerais: string | null;
    ativo: boolean;
    ultimo_login_em: string | null;
    created_at: string;
    updated_at: string;
    notificacoes_ativas?: boolean | null;
    notificacao_app_ativa?: boolean | null;
    notificacao_email_ativa?: boolean | null;
  };
  Insert: {
    id?: string;
    nome: string;
    email: string;
    telefone?: string | null;
    senha_hash: string;
    preferencias_gerais?: string | null;
    ativo?: boolean;
    ultimo_login_em?: string | null;
    created_at?: string;
    updated_at?: string;
    notificacoes_ativas?: boolean | null;
    notificacao_app_ativa?: boolean | null;
    notificacao_email_ativa?: boolean | null;
  };
  Update: {
    id?: string;
    nome?: string;
    email?: string;
    telefone?: string | null;
    senha_hash?: string;
    preferencias_gerais?: string | null;
    ativo?: boolean;
    ultimo_login_em?: string | null;
    created_at?: string;
    updated_at?: string;
    notificacoes_ativas?: boolean | null;
    notificacao_app_ativa?: boolean | null;
    notificacao_email_ativa?: boolean | null;
  };
  Relationships: [];
};

type DatabaseWithAppExtensions = Database & {
  public: Database["public"] & {
    Tables: Database["public"]["Tables"] & {
      servicos: Database["public"]["Tables"]["servicos"] & ServicosTableExtensions;
      servicos_combo_itens: ServicosComboItensTable;
      saloes_recursos_extras:
        Database["public"]["Tables"]["saloes_recursos_extras"] &
        SaloesRecursosExtrasTableExtensions;
      saloes: Database["public"]["Tables"]["saloes"] & SaloesSecurityTableExtensions;
      clientes_app_auth: ClientesAppAuthTable;
      security_login_attempts: SecurityLoginAttemptsTable;
      user_security_status: UserSecurityStatusTable;
      whatsapp_pacote_compras: WhatsappPacoteComprasTable;
    };
    Functions: Database["public"]["Functions"] & {
      fn_dashboard_resumo_painel: {
        Args: never;
        Returns: Json;
      };
      reservar_credito_whatsapp: {
        Args: { p_id_salao: string; p_quantidade?: number };
        Returns: string;
      };
      estornar_credito_whatsapp: {
        Args: { p_credito_id: string; p_quantidade?: number };
        Returns: undefined;
      };
    };
  };
};

export type AnySupabaseDatabase = DatabaseWithAppExtensions;
