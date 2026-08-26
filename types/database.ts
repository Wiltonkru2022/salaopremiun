import type { Database, Json } from "./database.generated";

type WhatsappPacoteComprasTable = {
  Row: {
    id: string; id_salao: string; id_pacote: string; status: string; billing_type: string;
    valor: number; quantidade_creditos: number; idempotency_key: string | null; external_reference: string;
    asaas_customer_id: string | null; asaas_payment_id: string | null; invoice_url: string | null;
    bank_slip_url: string | null; pix_copia_cola: string | null; qr_code_base64: string | null;
    response_json: Json; pago_em: string | null; criado_em: string; atualizado_em: string;
  };
  Insert: {
    id?: string; id_salao: string; id_pacote: string; status?: string; billing_type?: string;
    valor?: number; quantidade_creditos?: number; idempotency_key?: string | null; external_reference: string;
    asaas_customer_id?: string | null; asaas_payment_id?: string | null; invoice_url?: string | null;
    bank_slip_url?: string | null; pix_copia_cola?: string | null; qr_code_base64?: string | null;
    response_json?: Json; pago_em?: string | null; criado_em?: string; atualizado_em?: string;
  };
  Update: {
    id?: string; id_salao?: string; id_pacote?: string; status?: string; billing_type?: string;
    valor?: number; quantidade_creditos?: number; idempotency_key?: string | null; external_reference?: string;
    asaas_customer_id?: string | null; asaas_payment_id?: string | null; invoice_url?: string | null;
    bank_slip_url?: string | null; pix_copia_cola?: string | null; qr_code_base64?: string | null;
    response_json?: Json; pago_em?: string | null; criado_em?: string; atualizado_em?: string;
  };
  Relationships: [
    { foreignKeyName: "whatsapp_pacote_compras_id_pacote_fkey"; columns: ["id_pacote"]; isOneToOne: false; referencedRelation: "whatsapp_pacotes"; referencedColumns: ["id"] },
    { foreignKeyName: "whatsapp_pacote_compras_id_salao_fkey"; columns: ["id_salao"]; isOneToOne: false; referencedRelation: "saloes"; referencedColumns: ["id"] },
  ];
};

type ServicosTableExtensions = {
  Row: { eh_combo: boolean | null; combo_resumo: string | null };
  Insert: { eh_combo?: boolean | null; combo_resumo?: string | null };
  Update: { eh_combo?: boolean | null; combo_resumo?: string | null };
};

type ServicosComboItensTable = {
  Row: { ativo: boolean; created_at: string | null; id: string; id_salao: string; id_servico_combo: string; id_servico_item: string; ordem: number | null; percentual_rateio: number | null; preco_base: number | null; updated_at: string | null };
  Insert: { ativo?: boolean; created_at?: string | null; id?: string; id_salao: string; id_servico_combo: string; id_servico_item: string; ordem?: number | null; percentual_rateio?: number | null; preco_base?: number | null; updated_at?: string | null };
  Update: { ativo?: boolean; created_at?: string | null; id?: string; id_salao?: string; id_servico_combo?: string; id_servico_item?: string; ordem?: number | null; percentual_rateio?: number | null; preco_base?: number | null; updated_at?: string | null };
  Relationships: [
    { foreignKeyName: "servicos_combo_itens_id_salao_fkey"; columns: ["id_salao"]; isOneToOne: false; referencedRelation: "saloes"; referencedColumns: ["id"] },
    { foreignKeyName: "servicos_combo_itens_id_servico_combo_fkey"; columns: ["id_servico_combo"]; isOneToOne: false; referencedRelation: "servicos"; referencedColumns: ["id"] },
    { foreignKeyName: "servicos_combo_itens_id_servico_item_fkey"; columns: ["id_servico_item"]; isOneToOne: false; referencedRelation: "servicos"; referencedColumns: ["id"] }
  ];
};

type SaloesRecursosExtrasTableExtensions = {
  Row: { limite_numero: number | null };
  Insert: { limite_numero?: number | null };
  Update: { limite_numero?: number | null };
};

type SaloesSecurityTableExtensions = {
  Row: { status_seguranca: string | null; motivo_seguranca: string | null; bloqueado_ate: string | null };
  Insert: { status_seguranca?: string | null; motivo_seguranca?: string | null; bloqueado_ate?: string | null };
  Update: { status_seguranca?: string | null; motivo_seguranca?: string | null; bloqueado_ate?: string | null };
};

type UserSecurityStatusTable = {
  Row: { user_id: string; tipo_usuario: string; status: string; motivo: string | null; risco_atual: string; bloqueado_ate: string | null; verificacao_necessaria: boolean; criado_em: string; atualizado_em: string };
  Insert: { user_id: string; tipo_usuario: string; status?: string; motivo?: string | null; risco_atual?: string; bloqueado_ate?: string | null; verificacao_necessaria?: boolean; criado_em?: string; atualizado_em?: string };
  Update: { user_id?: string; tipo_usuario?: string; status?: string; motivo?: string | null; risco_atual?: string; bloqueado_ate?: string | null; verificacao_necessaria?: boolean; criado_em?: string; atualizado_em?: string };
  Relationships: [];
};

type SecurityLoginAttemptsTable = {
  Row: { id: string; tipo_usuario: string; user_id: string | null; id_salao: string | null; identidade: string | null; ip: string | null; user_agent: string | null; risco: string; criado_em: string };
  Insert: { id?: string; tipo_usuario: string; user_id?: string | null; id_salao?: string | null; identidade?: string | null; ip?: string | null; user_agent?: string | null; risco?: string; criado_em?: string };
  Update: { id?: string; tipo_usuario?: string; user_id?: string | null; id_salao?: string | null; identidade?: string | null; ip?: string | null; user_agent?: string | null; risco?: string; criado_em?: string };
  Relationships: [];
};

type ClientesAppAuthTable = {
  Row: {
    id: string; nome: string; email: string | null; telefone: string | null; whatsapp: string | null;
    cpf: string | null; data_nascimento: string | null; senha_hash: string | null; auth_version: number;
    migracao_identidade_concluida: boolean; email_verificado_em: string | null;
    preferencias_gerais: string | null; ativo: boolean; ultimo_login_em: string | null;
    created_at: string; updated_at: string; notificacoes_ativas?: boolean | null;
    notificacao_app_ativa?: boolean | null; notificacao_email_ativa?: boolean | null;
  };
  Insert: {
    id?: string; nome: string; email?: string | null; telefone?: string | null; whatsapp?: string | null;
    cpf?: string | null; data_nascimento?: string | null; senha_hash?: string | null; auth_version?: number;
    migracao_identidade_concluida?: boolean; email_verificado_em?: string | null;
    preferencias_gerais?: string | null; ativo?: boolean; ultimo_login_em?: string | null;
    created_at?: string; updated_at?: string; notificacoes_ativas?: boolean | null;
    notificacao_app_ativa?: boolean | null; notificacao_email_ativa?: boolean | null;
  };
  Update: {
    id?: string; nome?: string; email?: string | null; telefone?: string | null; whatsapp?: string | null;
    cpf?: string | null; data_nascimento?: string | null; senha_hash?: string | null; auth_version?: number;
    migracao_identidade_concluida?: boolean; email_verificado_em?: string | null;
    preferencias_gerais?: string | null; ativo?: boolean; ultimo_login_em?: string | null;
    created_at?: string; updated_at?: string; notificacoes_ativas?: boolean | null;
    notificacao_app_ativa?: boolean | null; notificacao_email_ativa?: boolean | null;
  };
  Relationships: [];
};

type ClienteAppEmailVerificacoesTable = {
  Row: { id: string; conta_id: string | null; finalidade: string; email: string; codigo_hash: string; expira_em: string; tentativas: number; consumido_em: string | null; criado_em: string; ip_hash: string | null; user_agent_hash: string | null };
  Insert: { id?: string; conta_id?: string | null; finalidade: string; email: string; codigo_hash: string; expira_em: string; tentativas?: number; consumido_em?: string | null; criado_em?: string; ip_hash?: string | null; user_agent_hash?: string | null };
  Update: { id?: string; conta_id?: string | null; finalidade?: string; email?: string; codigo_hash?: string; expira_em?: string; tentativas?: number; consumido_em?: string | null; criado_em?: string; ip_hash?: string | null; user_agent_hash?: string | null };
  Relationships: [];
};

type ClienteAppMigracaoTokensTable = {
  Row: { id: string; id_salao: string; id_cliente: string; conta_id: string | null; token_hash: string; expira_em: string; consumido_em: string | null; criado_por_usuario: string | null; criado_em: string };
  Insert: { id?: string; id_salao: string; id_cliente: string; conta_id?: string | null; token_hash: string; expira_em: string; consumido_em?: string | null; criado_por_usuario?: string | null; criado_em?: string };
  Update: { id?: string; id_salao?: string; id_cliente?: string; conta_id?: string | null; token_hash?: string; expira_em?: string; consumido_em?: string | null; criado_por_usuario?: string | null; criado_em?: string };
  Relationships: [];
};

type PublicSchema = Database["public"];
type BaseTables = PublicSchema["Tables"];

type WhatsappEnviosTable = Omit<
  BaseTables["whatsapp_envios"],
  "Row" | "Insert" | "Update"
> & {
  Row: BaseTables["whatsapp_envios"]["Row"] & {
    categoria_meta: string | null;
    custo_meta_estimado_centavos: number;
    entregue_em: string | null;
    estornado: boolean;
    estornado_em: string | null;
    falhou_em: string | null;
    id_credito_movimentacao: string | null;
    idempotency_key: string | null;
    lido_em: string | null;
    margem_centavos: number;
    preco_venda_centavos: number;
    sem_custo: boolean;
    tipo_interno: string | null;
    wamid: string | null;
  };
  Insert: BaseTables["whatsapp_envios"]["Insert"] & {
    categoria_meta?: string | null;
    custo_meta_estimado_centavos?: number;
    entregue_em?: string | null;
    estornado?: boolean;
    estornado_em?: string | null;
    falhou_em?: string | null;
    id_credito_movimentacao?: string | null;
    idempotency_key?: string | null;
    lido_em?: string | null;
    margem_centavos?: number;
    preco_venda_centavos?: number;
    sem_custo?: boolean;
    tipo_interno?: string | null;
    wamid?: string | null;
  };
  Update: BaseTables["whatsapp_envios"]["Update"] & {
    categoria_meta?: string | null;
    custo_meta_estimado_centavos?: number;
    entregue_em?: string | null;
    estornado?: boolean;
    estornado_em?: string | null;
    falhou_em?: string | null;
    id_credito_movimentacao?: string | null;
    idempotency_key?: string | null;
    lido_em?: string | null;
    margem_centavos?: number;
    preco_venda_centavos?: number;
    sem_custo?: boolean;
    tipo_interno?: string | null;
    wamid?: string | null;
  };
};

type WhatsappTemplatesTable = Omit<
  BaseTables["whatsapp_templates"],
  "Row" | "Insert" | "Update"
> & {
  Row: BaseTables["whatsapp_templates"]["Row"] & {
    atualizado_em: string;
    cabecalho: string | null;
    categoria_meta: string | null;
    idioma: string;
    nome_meta: string | null;
    tipo_interno: string | null;
    variaveis_json: Json;
  };
  Insert: BaseTables["whatsapp_templates"]["Insert"] & {
    atualizado_em?: string;
    cabecalho?: string | null;
    categoria_meta?: string | null;
    idioma?: string;
    nome_meta?: string | null;
    tipo_interno?: string | null;
    variaveis_json?: Json;
  };
  Update: BaseTables["whatsapp_templates"]["Update"] & {
    atualizado_em?: string;
    cabecalho?: string | null;
    categoria_meta?: string | null;
    idioma?: string;
    nome_meta?: string | null;
    tipo_interno?: string | null;
    variaveis_json?: Json;
  };
};

type WhatsappTarifasTable = {
  Row: {
    id: string;
    tipo_interno: string;
    categoria_meta: string;
    nome: string;
    descricao: string;
    custo_base_meta_centavos: number;
    preco_venda_centavos: number;
    margem_centavos: number;
    ativo: boolean;
    ordem: number;
    criado_em: string;
    atualizado_em: string;
  };
  Insert: {
    id?: string;
    tipo_interno: string;
    categoria_meta: string;
    nome: string;
    descricao: string;
    custo_base_meta_centavos?: number;
    preco_venda_centavos?: number;
    ativo?: boolean;
    ordem?: number;
    criado_em?: string;
    atualizado_em?: string;
  };
  Update: {
    id?: string;
    tipo_interno?: string;
    categoria_meta?: string;
    nome?: string;
    descricao?: string;
    custo_base_meta_centavos?: number;
    preco_venda_centavos?: number;
    ativo?: boolean;
    ordem?: number;
    criado_em?: string;
    atualizado_em?: string;
  };
  Relationships: [];
};

type WhatsappCreditosSaloesTable = {
  Row: {
    id: string;
    id_salao: string;
    saldo_centavos: number;
    total_recarregado_centavos: number;
    total_consumido_centavos: number;
    alerta_saldo_baixo_centavos: number;
    ultima_recarga_em: string | null;
    ultima_notificacao_saldo_baixo_em: string | null;
    criado_em: string;
    atualizado_em: string;
  };
  Insert: {
    id?: string;
    id_salao: string;
    saldo_centavos?: number;
    total_recarregado_centavos?: number;
    total_consumido_centavos?: number;
    alerta_saldo_baixo_centavos?: number;
    ultima_recarga_em?: string | null;
    ultima_notificacao_saldo_baixo_em?: string | null;
    criado_em?: string;
    atualizado_em?: string;
  };
  Update: {
    id?: string;
    id_salao?: string;
    saldo_centavos?: number;
    total_recarregado_centavos?: number;
    total_consumido_centavos?: number;
    alerta_saldo_baixo_centavos?: number;
    ultima_recarga_em?: string | null;
    ultima_notificacao_saldo_baixo_em?: string | null;
    criado_em?: string;
    atualizado_em?: string;
  };
  Relationships: [];
};

type WhatsappCreditosMovimentacoesTable = {
  Row: {
    id: string;
    id_salao: string;
    tipo: string;
    valor_centavos: number;
    saldo_antes_centavos: number;
    saldo_depois_centavos: number;
    categoria: string | null;
    tipo_interno: string | null;
    id_mensagem: string | null;
    id_agendamento: string | null;
    id_movimentacao_origem: string | null;
    id_admin_usuario: string | null;
    descricao: string | null;
    referencia_externa: string | null;
    criado_em: string;
  };
  Insert: {
    id?: string;
    id_salao: string;
    tipo: string;
    valor_centavos: number;
    saldo_antes_centavos: number;
    saldo_depois_centavos: number;
    categoria?: string | null;
    tipo_interno?: string | null;
    id_mensagem?: string | null;
    id_agendamento?: string | null;
    id_movimentacao_origem?: string | null;
    id_admin_usuario?: string | null;
    descricao?: string | null;
    referencia_externa?: string | null;
    criado_em?: string;
  };
  Update: {
    id?: string;
    id_salao?: string;
    tipo?: string;
    valor_centavos?: number;
    saldo_antes_centavos?: number;
    saldo_depois_centavos?: number;
    categoria?: string | null;
    tipo_interno?: string | null;
    id_mensagem?: string | null;
    id_agendamento?: string | null;
    id_movimentacao_origem?: string | null;
    id_admin_usuario?: string | null;
    descricao?: string | null;
    referencia_externa?: string | null;
    criado_em?: string;
  };
  Relationships: [];
};

type WhatsappCreditosRecargasTable = {
  Row: {
    id: string;
    id_salao: string;
    status: string;
    valor_centavos: number;
    billing_type: string;
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
    status?: string;
    valor_centavos: number;
    billing_type?: string;
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
    status?: string;
    valor_centavos?: number;
    billing_type?: string;
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
  Relationships: [];
};

type ClientesAuthTable = Omit<
  BaseTables["clientes_auth"],
  "Row" | "Insert" | "Update"
> & {
  Row: BaseTables["clientes_auth"]["Row"] & { app_conta_id: string | null };
  Insert: BaseTables["clientes_auth"]["Insert"] & { app_conta_id?: string | null };
  Update: BaseTables["clientes_auth"]["Update"] & { app_conta_id?: string | null };
};

type ExtendedTables = Omit<
  BaseTables,
  | "servicos"
  | "saloes_recursos_extras"
  | "saloes"
  | "clientes_app_auth"
  | "clientes_auth"
  | "whatsapp_envios"
  | "whatsapp_templates"
> & {
  servicos: BaseTables["servicos"] & ServicosTableExtensions;
  servicos_combo_itens: ServicosComboItensTable;
  saloes_recursos_extras: BaseTables["saloes_recursos_extras"] & SaloesRecursosExtrasTableExtensions;
  saloes: BaseTables["saloes"] & SaloesSecurityTableExtensions;
  clientes_app_auth: ClientesAppAuthTable;
  clientes_auth: ClientesAuthTable;
  cliente_app_email_verificacoes: ClienteAppEmailVerificacoesTable;
  cliente_app_migracao_tokens: ClienteAppMigracaoTokensTable;
  security_login_attempts: SecurityLoginAttemptsTable;
  user_security_status: UserSecurityStatusTable;
  whatsapp_envios: WhatsappEnviosTable;
  whatsapp_templates: WhatsappTemplatesTable;
  whatsapp_pacote_compras: WhatsappPacoteComprasTable;
  whatsapp_tarifas: WhatsappTarifasTable;
  whatsapp_creditos_saloes: WhatsappCreditosSaloesTable;
  whatsapp_creditos_movimentacoes: WhatsappCreditosMovimentacoesTable;
  whatsapp_creditos_recargas: WhatsappCreditosRecargasTable;
};

type ExtendedFunctions = PublicSchema["Functions"] & {
  fn_dashboard_resumo_painel: { Args: never; Returns: Json };
  reservar_credito_whatsapp: { Args: { p_id_salao: string; p_quantidade?: number }; Returns: string };
  estornar_credito_whatsapp: { Args: { p_credito_id: string; p_quantidade?: number }; Returns: undefined };
  fn_whatsapp_creditos_resumo: { Args: { p_id_salao: string }; Returns: Json };
  fn_whatsapp_creditos_registrar_recarga: {
    Args: {
      p_id_salao: string;
      p_valor_centavos: number;
      p_referencia_externa: string;
      p_descricao?: string;
    };
    Returns: string;
  };
  fn_whatsapp_creditos_debitar: {
    Args: {
      p_id_salao: string;
      p_tipo_interno: string;
      p_idempotency_key: string;
      p_id_mensagem?: string | null;
      p_id_agendamento?: string | null;
      p_descricao?: string | null;
    };
    Returns: Json;
  };
  fn_whatsapp_creditos_estornar: {
    Args: {
      p_id_salao: string;
      p_movimentacao_id: string;
      p_idempotency_key: string;
      p_descricao?: string | null;
    };
    Returns: Json;
  };
  fn_whatsapp_creditos_ajuste_admin: {
    Args: {
      p_id_salao: string;
      p_valor_centavos: number;
      p_motivo: string;
      p_id_admin_usuario: string;
      p_referencia_externa?: string | null;
    };
    Returns: string;
  };
};

type ExtendedPublicSchema = Omit<PublicSchema, "Tables" | "Functions"> & {
  Tables: ExtendedTables;
  Functions: ExtendedFunctions;
};

type DatabaseWithAppExtensions = Omit<Database, "public"> & {
  public: ExtendedPublicSchema;
};

export type AnyApplicationDatabase = DatabaseWithAppExtensions;
