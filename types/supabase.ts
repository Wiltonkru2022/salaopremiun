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

type DatabaseWithAppExtensions = Database & {
  public: Database["public"] & {
    Tables: Database["public"]["Tables"] & {
      whatsapp_pacote_compras: WhatsappPacoteComprasTable;
    };
    Functions: Database["public"]["Functions"] & {
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
