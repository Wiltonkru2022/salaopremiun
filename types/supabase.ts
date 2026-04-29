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

type DatabaseWithAppExtensions = Database & {
  public: Database["public"] & {
    Tables: Database["public"]["Tables"] & {
      servicos: Database["public"]["Tables"]["servicos"] & ServicosTableExtensions;
      servicos_combo_itens: ServicosComboItensTable;
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
