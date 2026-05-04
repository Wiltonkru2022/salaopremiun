export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      acoes_automaticas_sistema: {
        Row: {
          created_at: string
          detalhes_json: Json
          executada: boolean
          executada_em: string | null
          id: string
          log: string | null
          referencia: string | null
          sucesso: boolean
          tipo: string
        }
        Insert: {
          created_at?: string
          detalhes_json?: Json
          executada?: boolean
          executada_em?: string | null
          id?: string
          log?: string | null
          referencia?: string | null
          sucesso?: boolean
          tipo: string
        }
        Update: {
          created_at?: string
          detalhes_json?: Json
          executada?: boolean
          executada_em?: string | null
          id?: string
          log?: string | null
          referencia?: string | null
          sucesso?: boolean
          tipo?: string
        }
        Relationships: []
      }
      admin_master_anotacoes_salao: {
        Row: {
          atualizada_em: string
          criada_em: string
          id: string
          id_admin_usuario: string | null
          id_salao: string
          interna: boolean
          nota: string
          titulo: string
        }
        Insert: {
          atualizada_em?: string
          criada_em?: string
          id?: string
          id_admin_usuario?: string | null
          id_salao: string
          interna?: boolean
          nota: string
          titulo: string
        }
        Update: {
          atualizada_em?: string
          criada_em?: string
          id?: string
          id_admin_usuario?: string | null
          id_salao?: string
          interna?: boolean
          nota?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_master_anotacoes_salao_id_admin_usuario_fkey"
            columns: ["id_admin_usuario"]
            isOneToOne: false
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_master_anotacoes_salao_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_master_auditoria: {
        Row: {
          acao: string
          criado_em: string
          descricao: string | null
          entidade: string
          entidade_id: string | null
          id: string
          id_admin_usuario: string | null
          ip: string | null
          payload_json: Json
          user_agent: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          descricao?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          id_admin_usuario?: string | null
          ip?: string | null
          payload_json?: Json
          user_agent?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          descricao?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          id_admin_usuario?: string | null
          ip?: string | null
          payload_json?: Json
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_master_auditoria_id_admin_usuario_fkey"
            columns: ["id_admin_usuario"]
            isOneToOne: false
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_master_permissoes: {
        Row: {
          assinaturas_ajustar: boolean
          assinaturas_ver: boolean
          atualizado_em: string
          auditoria_ver: boolean
          campanhas_editar: boolean
          cobrancas_reprocessar: boolean
          cobrancas_ver: boolean
          comunicacao_ver: boolean
          criado_em: string
          dashboard_ver: boolean
          feature_flags_editar: boolean
          financeiro_ver: boolean
          id: string
          id_admin_master_usuario: string
          notificacoes_editar: boolean
          operacao_reprocessar: boolean
          operacao_ver: boolean
          planos_editar: boolean
          produto_ver: boolean
          recursos_editar: boolean
          relatorios_ver: boolean
          saloes_editar: boolean
          saloes_entrar_como: boolean
          saloes_ver: boolean
          suporte_ver: boolean
          tickets_editar: boolean
          tickets_ver: boolean
          usuarios_admin_editar: boolean
          usuarios_admin_ver: boolean
          whatsapp_editar: boolean
          whatsapp_ver: boolean
        }
        Insert: {
          assinaturas_ajustar?: boolean
          assinaturas_ver?: boolean
          atualizado_em?: string
          auditoria_ver?: boolean
          campanhas_editar?: boolean
          cobrancas_reprocessar?: boolean
          cobrancas_ver?: boolean
          comunicacao_ver?: boolean
          criado_em?: string
          dashboard_ver?: boolean
          feature_flags_editar?: boolean
          financeiro_ver?: boolean
          id?: string
          id_admin_master_usuario: string
          notificacoes_editar?: boolean
          operacao_reprocessar?: boolean
          operacao_ver?: boolean
          planos_editar?: boolean
          produto_ver?: boolean
          recursos_editar?: boolean
          relatorios_ver?: boolean
          saloes_editar?: boolean
          saloes_entrar_como?: boolean
          saloes_ver?: boolean
          suporte_ver?: boolean
          tickets_editar?: boolean
          tickets_ver?: boolean
          usuarios_admin_editar?: boolean
          usuarios_admin_ver?: boolean
          whatsapp_editar?: boolean
          whatsapp_ver?: boolean
        }
        Update: {
          assinaturas_ajustar?: boolean
          assinaturas_ver?: boolean
          atualizado_em?: string
          auditoria_ver?: boolean
          campanhas_editar?: boolean
          cobrancas_reprocessar?: boolean
          cobrancas_ver?: boolean
          comunicacao_ver?: boolean
          criado_em?: string
          dashboard_ver?: boolean
          feature_flags_editar?: boolean
          financeiro_ver?: boolean
          id?: string
          id_admin_master_usuario?: string
          notificacoes_editar?: boolean
          operacao_reprocessar?: boolean
          operacao_ver?: boolean
          planos_editar?: boolean
          produto_ver?: boolean
          recursos_editar?: boolean
          relatorios_ver?: boolean
          saloes_editar?: boolean
          saloes_entrar_como?: boolean
          saloes_ver?: boolean
          suporte_ver?: boolean
          tickets_editar?: boolean
          tickets_ver?: boolean
          usuarios_admin_editar?: boolean
          usuarios_admin_ver?: boolean
          whatsapp_editar?: boolean
          whatsapp_ver?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "admin_master_permissoes_id_admin_master_usuario_fkey"
            columns: ["id_admin_master_usuario"]
            isOneToOne: true
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_master_salao_tags: {
        Row: {
          criado_em: string
          id: string
          id_salao: string
          id_tag: string
        }
        Insert: {
          criado_em?: string
          id?: string
          id_salao: string
          id_tag: string
        }
        Update: {
          criado_em?: string
          id?: string
          id_salao?: string
          id_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_master_salao_tags_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_master_salao_tags_id_tag_fkey"
            columns: ["id_tag"]
            isOneToOne: false
            referencedRelation: "admin_master_tags_salao"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_master_tags_salao: {
        Row: {
          ativo: boolean
          cor: string
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      admin_master_usuarios: {
        Row: {
          atualizado_em: string
          auth_user_id: string | null
          criado_em: string
          email: string
          id: string
          nome: string
          perfil: string
          status: string
          ultimo_acesso_em: string | null
        }
        Insert: {
          atualizado_em?: string
          auth_user_id?: string | null
          criado_em?: string
          email: string
          id?: string
          nome: string
          perfil?: string
          status?: string
          ultimo_acesso_em?: string | null
        }
        Update: {
          atualizado_em?: string
          auth_user_id?: string | null
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          perfil?: string
          status?: string
          ultimo_acesso_em?: string | null
        }
        Relationships: []
      }
      agenda_bloqueios: {
        Row: {
          created_at: string | null
          data: string
          hora_fim: string
          hora_inicio: string
          id: string
          id_salao: string
          motivo: string | null
          profissional_id: string
        }
        Insert: {
          created_at?: string | null
          data: string
          hora_fim: string
          hora_inicio: string
          id?: string
          id_salao: string
          motivo?: string | null
          profissional_id: string
        }
        Update: {
          created_at?: string | null
          data?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          id_salao?: string
          motivo?: string | null
          profissional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_bloqueios_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_bloqueios_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_bloqueios_logs: {
        Row: {
          bloqueio_id: string | null
          created_at: string | null
          data: string | null
          deleted_by: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          id_salao: string
          motivo_exclusao: string | null
          motivo_original: string | null
          profissional_id: string | null
        }
        Insert: {
          bloqueio_id?: string | null
          created_at?: string | null
          data?: string | null
          deleted_by?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          id_salao: string
          motivo_exclusao?: string | null
          motivo_original?: string | null
          profissional_id?: string | null
        }
        Update: {
          bloqueio_id?: string | null
          created_at?: string | null
          data?: string | null
          deleted_by?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          id_salao?: string
          motivo_exclusao?: string | null
          motivo_original?: string | null
          profissional_id?: string | null
        }
        Relationships: []
      }
      agendamentos: {
        Row: {
          cliente_id: string
          created_at: string | null
          data: string
          duracao_minutos: number
          hora_fim: string
          hora_inicio: string
          id: string
          id_comanda: string | null
          id_salao: string
          observacoes: string | null
          origem: string | null
          profissional_id: string
          servico_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data: string
          duracao_minutos?: number
          hora_fim: string
          hora_inicio: string
          id?: string
          id_comanda?: string | null
          id_salao: string
          observacoes?: string | null
          origem?: string | null
          profissional_id: string
          servico_id: string
          status: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data?: string
          duracao_minutos?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          id_comanda?: string | null
          id_salao?: string
          observacoes?: string | null
          origem?: string | null
          profissional_id?: string
          servico_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vw_vendas_busca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_profissional_fk"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_sistema: {
        Row: {
          atualizado_em: string
          automatico: boolean
          chave: string | null
          criado_em: string
          descricao: string | null
          gravidade: string
          id: string
          id_salao: string | null
          id_ticket: string | null
          origem_modulo: string
          payload_json: Json
          resolvido: boolean
          resolvido_em: string | null
          resolvido_por: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          automatico?: boolean
          chave?: string | null
          criado_em?: string
          descricao?: string | null
          gravidade?: string
          id?: string
          id_salao?: string | null
          id_ticket?: string | null
          origem_modulo?: string
          payload_json?: Json
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          automatico?: boolean
          chave?: string | null
          criado_em?: string
          descricao?: string | null
          gravidade?: string
          id?: string
          id_salao?: string | null
          id_ticket?: string | null
          origem_modulo?: string
          payload_json?: Json
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_sistema_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_sistema_id_ticket_fkey"
            columns: ["id_ticket"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_sistema_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_webhook_eventos: {
        Row: {
          created_at: string | null
          decisao: string | null
          erro_mensagem: string | null
          event_order: number
          event_type: string
          evento: string | null
          fingerprint: string | null
          id: string
          id_assinatura: string | null
          id_cobranca: string | null
          id_salao: string | null
          idempotencia_key: string
          payload: Json
          payment_id: string | null
          payment_status: string | null
          primeiro_recebido_em: string | null
          processado_em: string | null
          processed_at: string
          status_processamento: string | null
          tentativas: number | null
          ultimo_recebido_em: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decisao?: string | null
          erro_mensagem?: string | null
          event_order?: number
          event_type: string
          evento?: string | null
          fingerprint?: string | null
          id?: string
          id_assinatura?: string | null
          id_cobranca?: string | null
          id_salao?: string | null
          idempotencia_key?: string
          payload?: Json
          payment_id?: string | null
          payment_status?: string | null
          primeiro_recebido_em?: string | null
          processado_em?: string | null
          processed_at?: string
          status_processamento?: string | null
          tentativas?: number | null
          ultimo_recebido_em?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decisao?: string | null
          erro_mensagem?: string | null
          event_order?: number
          event_type?: string
          evento?: string | null
          fingerprint?: string | null
          id?: string
          id_assinatura?: string | null
          id_cobranca?: string | null
          id_salao?: string | null
          idempotencia_key?: string
          payload?: Json
          payment_id?: string | null
          payment_status?: string | null
          primeiro_recebido_em?: string | null
          processado_em?: string | null
          processed_at?: string
          status_processamento?: string | null
          tentativas?: number | null
          ultimo_recebido_em?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      assinatura_checkout_locks: {
        Row: {
          asaas_payment_id: string | null
          billing_type: string
          created_at: string
          erro_texto: string | null
          expires_at: string
          id: string
          id_cobranca: string | null
          id_salao: string
          idempotency_key: string
          payload_json: Json
          plano_codigo: string
          response_json: Json
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          asaas_payment_id?: string | null
          billing_type: string
          created_at?: string
          erro_texto?: string | null
          expires_at?: string
          id?: string
          id_cobranca?: string | null
          id_salao: string
          idempotency_key: string
          payload_json?: Json
          plano_codigo: string
          response_json?: Json
          status?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          asaas_payment_id?: string | null
          billing_type?: string
          created_at?: string
          erro_texto?: string | null
          expires_at?: string
          id?: string
          id_cobranca?: string | null
          id_salao?: string
          idempotency_key?: string
          payload_json?: Json
          plano_codigo?: string
          response_json?: Json
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      assinaturas: {
        Row: {
          asaas_credit_card_brand: string | null
          asaas_credit_card_last4: string | null
          asaas_credit_card_token: string | null
          asaas_credit_card_tokenized_at: string | null
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          asaas_subscription_status: string | null
          created_at: string | null
          forma_pagamento_atual: string | null
          gateway: string | null
          id: string
          id_cobranca_atual: string | null
          id_salao: string
          limite_profissionais: number | null
          limite_usuarios: number | null
          pago_em: string | null
          plano: string | null
          referencia_atual: string | null
          renovacao_automatica: boolean
          status: string | null
          trial_ativo: string | null
          trial_fim_em: string | null
          trial_inicio_em: string | null
          updated_at: string | null
          valor: number | null
          vencimento_em: string | null
        }
        Insert: {
          asaas_credit_card_brand?: string | null
          asaas_credit_card_last4?: string | null
          asaas_credit_card_token?: string | null
          asaas_credit_card_tokenized_at?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          asaas_subscription_status?: string | null
          created_at?: string | null
          forma_pagamento_atual?: string | null
          gateway?: string | null
          id?: string
          id_cobranca_atual?: string | null
          id_salao: string
          limite_profissionais?: number | null
          limite_usuarios?: number | null
          pago_em?: string | null
          plano?: string | null
          referencia_atual?: string | null
          renovacao_automatica?: boolean
          status?: string | null
          trial_ativo?: string | null
          trial_fim_em?: string | null
          trial_inicio_em?: string | null
          updated_at?: string | null
          valor?: number | null
          vencimento_em?: string | null
        }
        Update: {
          asaas_credit_card_brand?: string | null
          asaas_credit_card_last4?: string | null
          asaas_credit_card_token?: string | null
          asaas_credit_card_tokenized_at?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          asaas_subscription_status?: string | null
          created_at?: string | null
          forma_pagamento_atual?: string | null
          gateway?: string | null
          id?: string
          id_cobranca_atual?: string | null
          id_salao?: string
          limite_profissionais?: number | null
          limite_usuarios?: number | null
          pago_em?: string | null
          plano?: string | null
          referencia_atual?: string | null
          renovacao_automatica?: boolean
          status?: string | null
          trial_ativo?: string | null
          trial_fim_em?: string | null
          trial_inicio_em?: string | null
          updated_at?: string | null
          valor?: number | null
          vencimento_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: true
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas_cobrancas: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          asaas_status: string | null
          asaas_subscription_id: string | null
          bank_slip_url: string | null
          checkout_lock_id: string | null
          confirmed_date: string | null
          created_at: string
          credit_card_brand: string | null
          credit_card_last4: string | null
          data_expiracao: string | null
          deleted: boolean | null
          descricao: string | null
          external_reference: string | null
          forma_pagamento: string | null
          gateway: string | null
          gerada_automaticamente: boolean
          id: string
          id_assinatura: string
          id_plano: string
          id_salao: string
          idempotency_key: string | null
          invoice_url: string | null
          metadata: Json | null
          pago_em: string | null
          paid_em: string | null
          payment_date: string | null
          pix_copia_cola: string | null
          pix_qr_code_base64: string | null
          plano_destino: string | null
          plano_origem: string | null
          referencia: string | null
          status: string
          tipo_movimento: string
          txid: string | null
          updated_at: string
          valor: number
          webhook_event_order: number
          webhook_last_event: string | null
          webhook_payload: Json | null
          webhook_processed_at: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_status?: string | null
          asaas_subscription_id?: string | null
          bank_slip_url?: string | null
          checkout_lock_id?: string | null
          confirmed_date?: string | null
          created_at?: string
          credit_card_brand?: string | null
          credit_card_last4?: string | null
          data_expiracao?: string | null
          deleted?: boolean | null
          descricao?: string | null
          external_reference?: string | null
          forma_pagamento?: string | null
          gateway?: string | null
          gerada_automaticamente?: boolean
          id?: string
          id_assinatura: string
          id_plano: string
          id_salao: string
          idempotency_key?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          pago_em?: string | null
          paid_em?: string | null
          payment_date?: string | null
          pix_copia_cola?: string | null
          pix_qr_code_base64?: string | null
          plano_destino?: string | null
          plano_origem?: string | null
          referencia?: string | null
          status?: string
          tipo_movimento?: string
          txid?: string | null
          updated_at?: string
          valor?: number
          webhook_event_order?: number
          webhook_last_event?: string | null
          webhook_payload?: Json | null
          webhook_processed_at?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_status?: string | null
          asaas_subscription_id?: string | null
          bank_slip_url?: string | null
          checkout_lock_id?: string | null
          confirmed_date?: string | null
          created_at?: string
          credit_card_brand?: string | null
          credit_card_last4?: string | null
          data_expiracao?: string | null
          deleted?: boolean | null
          descricao?: string | null
          external_reference?: string | null
          forma_pagamento?: string | null
          gateway?: string | null
          gerada_automaticamente?: boolean
          id?: string
          id_assinatura?: string
          id_plano?: string
          id_salao?: string
          idempotency_key?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          pago_em?: string | null
          paid_em?: string | null
          payment_date?: string | null
          pix_copia_cola?: string | null
          pix_qr_code_base64?: string | null
          plano_destino?: string | null
          plano_origem?: string | null
          referencia?: string | null
          status?: string
          tipo_movimento?: string
          txid?: string | null
          updated_at?: string
          valor?: number
          webhook_event_order?: number
          webhook_last_event?: string | null
          webhook_payload?: Json | null
          webhook_processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_cobrancas_id_plano_fkey"
            columns: ["id_plano"]
            isOneToOne: false
            referencedRelation: "planos_saas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_cobrancas_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas_saloes: {
        Row: {
          created_at: string
          gateway: string | null
          id: string
          id_plano: string
          id_salao: string
          inicio_em: string | null
          observacoes: string | null
          renovacao_automatica: boolean
          status: string
          trial_ativo: boolean
          trial_fim_em: string | null
          trial_inicio_em: string | null
          updated_at: string
          valor_mensal: number
          vencimento_em: string | null
        }
        Insert: {
          created_at?: string
          gateway?: string | null
          id?: string
          id_plano: string
          id_salao: string
          inicio_em?: string | null
          observacoes?: string | null
          renovacao_automatica?: boolean
          status?: string
          trial_ativo?: boolean
          trial_fim_em?: string | null
          trial_inicio_em?: string | null
          updated_at?: string
          valor_mensal?: number
          vencimento_em?: string | null
        }
        Update: {
          created_at?: string
          gateway?: string | null
          id?: string
          id_plano?: string
          id_salao?: string
          inicio_em?: string | null
          observacoes?: string | null
          renovacao_automatica?: boolean
          status?: string
          trial_ativo?: boolean
          trial_fim_em?: string | null
          trial_inicio_em?: string | null
          updated_at?: string
          valor_mensal?: number
          vencimento_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_saloes_id_plano_fkey"
            columns: ["id_plano"]
            isOneToOne: false
            referencedRelation: "planos_saas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_saloes_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_logs: {
        Row: {
          acao: string
          auth_user_id: string | null
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string | null
          entidade: string
          entidade_id: string | null
          id: string
          id_salao: string
          id_usuario: string | null
          metadata: Json | null
          modulo: string
        }
        Insert: {
          acao: string
          auth_user_id?: string | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          id_salao: string
          id_usuario?: string | null
          metadata?: Json | null
          modulo: string
        }
        Update: {
          acao?: string
          auth_user_id?: string | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          id_salao?: string
          id_usuario?: string | null
          metadata?: Json | null
          modulo?: string
        }
        Relationships: []
      }
      backups_salao: {
        Row: {
          created_at: string | null
          dados: Json
          descricao: string | null
          id: string
          id_salao: string
          tamanho_kb: number | null
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          dados: Json
          descricao?: string | null
          id?: string
          id_salao: string
          tamanho_kb?: number | null
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          dados?: Json
          descricao?: string | null
          id?: string
          id_salao?: string
          tamanho_kb?: number | null
          tipo?: string | null
        }
        Relationships: []
      }
      caixa_movimentacoes: {
        Row: {
          created_at: string
          descricao: string | null
          forma_pagamento: string | null
          id: string
          id_comanda: string | null
          id_profissional: string | null
          id_salao: string
          id_sessao: string
          id_usuario: string | null
          idempotency_key: string | null
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          id_comanda?: string | null
          id_profissional?: string | null
          id_salao: string
          id_sessao: string
          id_usuario?: string | null
          idempotency_key?: string | null
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          id_comanda?: string | null
          id_profissional?: string | null
          id_salao?: string
          id_sessao?: string
          id_usuario?: string | null
          idempotency_key?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimentacoes_id_sessao_fkey"
            columns: ["id_sessao"]
            isOneToOne: false
            referencedRelation: "caixa_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_sessoes: {
        Row: {
          aberto_em: string
          created_at: string
          fechado_em: string | null
          id: string
          id_salao: string
          id_usuario_abertura: string | null
          id_usuario_fechamento: string | null
          observacoes: string | null
          status: string
          tipo_fechamento: string | null
          updated_at: string
          valor_abertura: number
          valor_diferenca_fechamento: number | null
          valor_fechamento_informado: number | null
          valor_previsto_fechamento: number | null
        }
        Insert: {
          aberto_em?: string
          created_at?: string
          fechado_em?: string | null
          id?: string
          id_salao: string
          id_usuario_abertura?: string | null
          id_usuario_fechamento?: string | null
          observacoes?: string | null
          status?: string
          tipo_fechamento?: string | null
          updated_at?: string
          valor_abertura?: number
          valor_diferenca_fechamento?: number | null
          valor_fechamento_informado?: number | null
          valor_previsto_fechamento?: number | null
        }
        Update: {
          aberto_em?: string
          created_at?: string
          fechado_em?: string | null
          id?: string
          id_salao?: string
          id_usuario_abertura?: string | null
          id_usuario_fechamento?: string | null
          observacoes?: string | null
          status?: string
          tipo_fechamento?: string | null
          updated_at?: string
          valor_abertura?: number
          valor_diferenca_fechamento?: number | null
          valor_fechamento_informado?: number | null
          valor_previsto_fechamento?: number | null
        }
        Relationships: []
      }
      campanha_destinos: {
        Row: {
          entregue_em: string | null
          id: string
          id_campanha: string
          id_salao: string
          resultado_json: Json
          status: string
        }
        Insert: {
          entregue_em?: string | null
          id?: string
          id_campanha: string
          id_salao: string
          resultado_json?: Json
          status?: string
        }
        Update: {
          entregue_em?: string | null
          id?: string
          id_campanha?: string
          id_salao?: string
          resultado_json?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_destinos_id_campanha_fkey"
            columns: ["id_campanha"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_destinos_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          criada_em: string
          criado_por: string | null
          filtros_json: Json
          fim_em: string | null
          id: string
          inicio_em: string | null
          nome: string
          objetivo: string | null
          publico_tipo: string
          status: string
          tipo: string
        }
        Insert: {
          criada_em?: string
          criado_por?: string | null
          filtros_json?: Json
          fim_em?: string | null
          id?: string
          inicio_em?: string | null
          nome: string
          objetivo?: string | null
          publico_tipo?: string
          status?: string
          tipo?: string
        }
        Update: {
          criada_em?: string
          criado_por?: string | null
          filtros_json?: Json
          fim_em?: string | null
          id?: string
          inicio_em?: string | null
          nome?: string
          objetivo?: string | null
          publico_tipo?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_itens: {
        Row: {
          ativo: boolean
          codigo: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      checklists_salao: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          id: string
          id_checklist_item: string
          id_salao: string
          origem: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          id_checklist_item: string
          id_salao: string
          origem?: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          id_checklist_item?: string
          id_salao?: string
          origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_salao_id_checklist_item_fkey"
            columns: ["id_checklist_item"]
            isOneToOne: false
            referencedRelation: "checklist_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_salao_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: string | null
          atualizado_em: string | null
          bairro: string | null
          cashback: number | null
          cep: string | null
          cidade: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          deleted_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          foto_url: string | null
          id: string
          id_salao: string | null
          nome: string | null
          nome_social: string | null
          numero: string | null
          observacoes: string | null
          profissao: string | null
          rua: string | null
          status: string | null
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: string | null
          atualizado_em?: string | null
          bairro?: string | null
          cashback?: number | null
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          id_salao?: string | null
          nome?: string | null
          nome_social?: string | null
          numero?: string | null
          observacoes?: string | null
          profissao?: string | null
          rua?: string | null
          status?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: string | null
          atualizado_em?: string | null
          bairro?: string | null
          cashback?: number | null
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          id_salao?: string | null
          nome?: string | null
          nome_social?: string | null
          numero?: string | null
          observacoes?: string | null
          profissao?: string | null
          rua?: string | null
          status?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      clientes_auth: {
        Row: {
          app_ativo: boolean
          created_at: string
          email: string | null
          id: string
          id_cliente: string
          id_salao: string
          reset_token: string | null
          reset_token_expira_em: string | null
          senha_hash: string | null
          ultimo_login_em: string | null
          updated_at: string
        }
        Insert: {
          app_ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          id_cliente: string
          id_salao: string
          reset_token?: string | null
          reset_token_expira_em?: string | null
          senha_hash?: string | null
          ultimo_login_em?: string | null
          updated_at?: string
        }
        Update: {
          app_ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          id_cliente?: string
          id_salao?: string
          reset_token?: string | null
          reset_token_expira_em?: string | null
          senha_hash?: string | null
          ultimo_login_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_auth_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_auth_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_autorizacoes: {
        Row: {
          autoriza_email_marketing: boolean
          autoriza_uso_imagem: boolean
          autoriza_whatsapp_marketing: boolean
          created_at: string
          data_aceite_lgpd: string | null
          id: string
          id_cliente: string
          id_salao: string
          observacoes_autorizacao: string | null
          termo_lgpd_aceito: boolean
          updated_at: string
        }
        Insert: {
          autoriza_email_marketing?: boolean
          autoriza_uso_imagem?: boolean
          autoriza_whatsapp_marketing?: boolean
          created_at?: string
          data_aceite_lgpd?: string | null
          id?: string
          id_cliente: string
          id_salao: string
          observacoes_autorizacao?: string | null
          termo_lgpd_aceito?: boolean
          updated_at?: string
        }
        Update: {
          autoriza_email_marketing?: boolean
          autoriza_uso_imagem?: boolean
          autoriza_whatsapp_marketing?: boolean
          created_at?: string
          data_aceite_lgpd?: string | null
          id?: string
          id_cliente?: string
          id_salao?: string
          observacoes_autorizacao?: string | null
          termo_lgpd_aceito?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_autorizacoes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_autorizacoes_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_ficha_tecnica: {
        Row: {
          alergias: string | null
          condicoes_couro_cabeludo_pele: string | null
          created_at: string
          gestante: boolean
          historico_quimico: string | null
          id: string
          id_cliente: string
          id_salao: string
          lactante: boolean
          observacoes_tecnicas: string | null
          restricoes_quimicas: string | null
          updated_at: string
          uso_medicamentos: string | null
        }
        Insert: {
          alergias?: string | null
          condicoes_couro_cabeludo_pele?: string | null
          created_at?: string
          gestante?: boolean
          historico_quimico?: string | null
          id?: string
          id_cliente: string
          id_salao: string
          lactante?: boolean
          observacoes_tecnicas?: string | null
          restricoes_quimicas?: string | null
          updated_at?: string
          uso_medicamentos?: string | null
        }
        Update: {
          alergias?: string | null
          condicoes_couro_cabeludo_pele?: string | null
          created_at?: string
          gestante?: boolean
          historico_quimico?: string | null
          id?: string
          id_cliente?: string
          id_salao?: string
          lactante?: boolean
          observacoes_tecnicas?: string | null
          restricoes_quimicas?: string | null
          updated_at?: string
          uso_medicamentos?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_ficha_tecnica_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_ficha_tecnica_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_historico: {
        Row: {
          created_at: string
          data_evento: string
          descricao: string
          id: string
          id_cliente: string
          id_profissional: string | null
          id_salao: string
          tipo: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          data_evento?: string
          descricao: string
          id?: string
          id_cliente: string
          id_profissional?: string | null
          id_salao: string
          tipo: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          data_evento?: string
          descricao?: string
          id?: string
          id_cliente?: string
          id_profissional?: string | null
          id_salao?: string
          tipo?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_historico_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_historico_id_profissional_fkey"
            columns: ["id_profissional"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_historico_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_preferencias: {
        Row: {
          bebida_favorita: string | null
          como_conheceu_salao: string | null
          created_at: string
          estilo_atendimento: string | null
          frequencia_visitas: string | null
          id: string
          id_cliente: string
          id_salao: string
          preferencias_gerais: string | null
          profissional_favorito_id: string | null
          revistas_assuntos_preferidos: string | null
          updated_at: string
        }
        Insert: {
          bebida_favorita?: string | null
          como_conheceu_salao?: string | null
          created_at?: string
          estilo_atendimento?: string | null
          frequencia_visitas?: string | null
          id?: string
          id_cliente: string
          id_salao: string
          preferencias_gerais?: string | null
          profissional_favorito_id?: string | null
          revistas_assuntos_preferidos?: string | null
          updated_at?: string
        }
        Update: {
          bebida_favorita?: string | null
          como_conheceu_salao?: string | null
          created_at?: string
          estilo_atendimento?: string | null
          frequencia_visitas?: string | null
          id?: string
          id_cliente?: string
          id_salao?: string
          preferencias_gerais?: string | null
          profissional_favorito_id?: string | null
          revistas_assuntos_preferidos?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_preferencias_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_preferencias_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_preferencias_profissional_favorito_id_fkey"
            columns: ["profissional_favorito_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      comanda_itens: {
        Row: {
          ativo: boolean | null
          base_calculo_aplicada: string | null
          comissao_assistente_percentual_aplicada: number | null
          comissao_assistente_valor_aplicado: number | null
          comissao_percentual_aplicada: number | null
          comissao_valor_aplicado: number | null
          created_at: string
          custo_total: number
          desconta_taxa_maquininha_aplicada: boolean | null
          descricao: string
          id: string
          id_agendamento: string | null
          id_assistente: string | null
          id_comanda: string
          id_item_extra: string | null
          id_produto: string | null
          id_profissional: string | null
          id_salao: string
          id_servico: string | null
          idempotency_key: string | null
          observacoes: string | null
          origem: string
          quantidade: number
          tipo: string | null
          tipo_item: string
          updated_at: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          ativo?: boolean | null
          base_calculo_aplicada?: string | null
          comissao_assistente_percentual_aplicada?: number | null
          comissao_assistente_valor_aplicado?: number | null
          comissao_percentual_aplicada?: number | null
          comissao_valor_aplicado?: number | null
          created_at?: string
          custo_total?: number
          desconta_taxa_maquininha_aplicada?: boolean | null
          descricao: string
          id?: string
          id_agendamento?: string | null
          id_assistente?: string | null
          id_comanda: string
          id_item_extra?: string | null
          id_produto?: string | null
          id_profissional?: string | null
          id_salao: string
          id_servico?: string | null
          idempotency_key?: string | null
          observacoes?: string | null
          origem?: string
          quantidade?: number
          tipo?: string | null
          tipo_item: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          ativo?: boolean | null
          base_calculo_aplicada?: string | null
          comissao_assistente_percentual_aplicada?: number | null
          comissao_assistente_valor_aplicado?: number | null
          comissao_percentual_aplicada?: number | null
          comissao_valor_aplicado?: number | null
          created_at?: string
          custo_total?: number
          desconta_taxa_maquininha_aplicada?: boolean | null
          descricao?: string
          id?: string
          id_agendamento?: string | null
          id_assistente?: string | null
          id_comanda?: string
          id_item_extra?: string | null
          id_produto?: string | null
          id_profissional?: string | null
          id_salao?: string
          id_servico?: string | null
          idempotency_key?: string | null
          observacoes?: string | null
          origem?: string
          quantidade?: number
          tipo?: string | null
          tipo_item?: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "comanda_itens_id_agendamento_fkey"
            columns: ["id_agendamento"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_itens_id_assistente_fkey"
            columns: ["id_assistente"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_itens_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_itens_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_itens_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vw_vendas_busca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_itens_id_produto_fkey"
            columns: ["id_produto"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_itens_id_profissional_fkey"
            columns: ["id_profissional"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_itens_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_itens_id_servico_fkey"
            columns: ["id_servico"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      comanda_pagamentos: {
        Row: {
          created_at: string
          forma_pagamento: string
          id: string
          id_comanda: string
          id_movimentacao: string | null
          id_salao: string
          idempotency_key: string | null
          observacoes: string | null
          pago_em: string
          parcelas: number | null
          taxa: number
          taxa_maquininha_percentual: number | null
          taxa_maquininha_valor: number | null
          valor: number
        }
        Insert: {
          created_at?: string
          forma_pagamento: string
          id?: string
          id_comanda: string
          id_movimentacao?: string | null
          id_salao: string
          idempotency_key?: string | null
          observacoes?: string | null
          pago_em?: string
          parcelas?: number | null
          taxa?: number
          taxa_maquininha_percentual?: number | null
          taxa_maquininha_valor?: number | null
          valor?: number
        }
        Update: {
          created_at?: string
          forma_pagamento?: string
          id?: string
          id_comanda?: string
          id_movimentacao?: string | null
          id_salao?: string
          idempotency_key?: string | null
          observacoes?: string | null
          pago_em?: string
          parcelas?: number | null
          taxa?: number
          taxa_maquininha_percentual?: number | null
          taxa_maquininha_valor?: number | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "comanda_pagamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_pagamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_pagamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vw_vendas_busca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_pagamentos_id_movimentacao_fkey"
            columns: ["id_movimentacao"]
            isOneToOne: false
            referencedRelation: "caixa_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_pagamentos_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      comandas: {
        Row: {
          aberta_em: string
          acrescimo: number
          cancelada_em: string | null
          created_at: string
          desconto: number
          fechada_em: string | null
          id: string
          id_agendamento_principal: string | null
          id_cliente: string | null
          id_salao: string
          motivo_cancelamento: string | null
          numero: number
          observacoes: string | null
          origem: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          aberta_em?: string
          acrescimo?: number
          cancelada_em?: string | null
          created_at?: string
          desconto?: number
          fechada_em?: string | null
          id?: string
          id_agendamento_principal?: string | null
          id_cliente?: string | null
          id_salao: string
          motivo_cancelamento?: string | null
          numero: number
          observacoes?: string | null
          origem?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          aberta_em?: string
          acrescimo?: number
          cancelada_em?: string | null
          created_at?: string
          desconto?: number
          fechada_em?: string | null
          id?: string
          id_agendamento_principal?: string | null
          id_cliente?: string | null
          id_salao?: string
          motivo_cancelamento?: string | null
          numero?: number
          observacoes?: string | null
          origem?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comandas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      comandas_logs_exclusao: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          id: string
          id_cliente: string | null
          id_comanda: string
          id_salao: string
          motivo: string | null
          numero_comanda: number | null
          snapshot: Json | null
          status_comanda: string | null
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          id_cliente?: string | null
          id_comanda: string
          id_salao: string
          motivo?: string | null
          numero_comanda?: number | null
          snapshot?: Json | null
          status_comanda?: string | null
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          id_cliente?: string | null
          id_comanda?: string
          id_salao?: string
          motivo?: string | null
          numero_comanda?: number | null
          snapshot?: Json | null
          status_comanda?: string | null
        }
        Relationships: []
      }
      comandas_logs_reabertura: {
        Row: {
          id: string
          id_comanda: string
          id_salao: string
          motivo: string | null
          numero_comanda: number | null
          reopened_at: string
          reopened_by: string | null
          status_anterior: string | null
        }
        Insert: {
          id?: string
          id_comanda: string
          id_salao: string
          motivo?: string | null
          numero_comanda?: number | null
          reopened_at?: string
          reopened_by?: string | null
          status_anterior?: string | null
        }
        Update: {
          id?: string
          id_comanda?: string
          id_salao?: string
          motivo?: string | null
          numero_comanda?: number | null
          reopened_at?: string
          reopened_by?: string | null
          status_anterior?: string | null
        }
        Relationships: []
      }
      comissao_lancamentos: {
        Row: {
          created_at: string
          id: string
          id_assistente: string | null
          id_comanda: string | null
          id_comanda_item: string | null
          id_profissional: string | null
          id_salao: string
          percentual_assistente: number | null
          percentual_profissional: number | null
          referencia: string | null
          status: string
          tipo: string
          valor_assistente: number | null
          valor_base: number
          valor_profissional: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          id_assistente?: string | null
          id_comanda?: string | null
          id_comanda_item?: string | null
          id_profissional?: string | null
          id_salao: string
          percentual_assistente?: number | null
          percentual_profissional?: number | null
          referencia?: string | null
          status?: string
          tipo?: string
          valor_assistente?: number | null
          valor_base?: number
          valor_profissional?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          id_assistente?: string | null
          id_comanda?: string | null
          id_comanda_item?: string | null
          id_profissional?: string | null
          id_salao?: string
          percentual_assistente?: number | null
          percentual_profissional?: number | null
          referencia?: string | null
          status?: string
          tipo?: string
          valor_assistente?: number | null
          valor_base?: number
          valor_profissional?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comissao_lancamentos_id_assistente_fkey"
            columns: ["id_assistente"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissao_lancamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissao_lancamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissao_lancamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vw_vendas_busca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissao_lancamentos_id_comanda_item_fkey"
            columns: ["id_comanda_item"]
            isOneToOne: false
            referencedRelation: "comanda_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissao_lancamentos_id_profissional_fkey"
            columns: ["id_profissional"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissao_lancamentos_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes_assistentes: {
        Row: {
          competencia_data: string
          criado_em: string
          descricao: string | null
          id: string
          id_assistente: string
          id_comanda: string
          id_comanda_item: string | null
          id_comissao_lancamento: string | null
          id_profissional: string | null
          id_salao: string
          observacoes: string | null
          pago_em: string | null
          percentual_aplicado: number
          status: string
          updated_at: string
          valor_assistente: number
          valor_base: number
        }
        Insert: {
          competencia_data?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          id_assistente: string
          id_comanda: string
          id_comanda_item?: string | null
          id_comissao_lancamento?: string | null
          id_profissional?: string | null
          id_salao: string
          observacoes?: string | null
          pago_em?: string | null
          percentual_aplicado?: number
          status?: string
          updated_at?: string
          valor_assistente?: number
          valor_base?: number
        }
        Update: {
          competencia_data?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          id_assistente?: string
          id_comanda?: string
          id_comanda_item?: string | null
          id_comissao_lancamento?: string | null
          id_profissional?: string | null
          id_salao?: string
          observacoes?: string | null
          pago_em?: string | null
          percentual_aplicado?: number
          status?: string
          updated_at?: string
          valor_assistente?: number
          valor_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_assistentes_id_comissao_lancamento_fkey"
            columns: ["id_comissao_lancamento"]
            isOneToOne: false
            referencedRelation: "comissoes_lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes_lancamentos: {
        Row: {
          competencia: string | null
          competencia_data: string
          criado_em: string
          descricao: string
          id: string
          id_agendamento: string | null
          id_assistente: string | null
          id_comanda: string | null
          id_comanda_item: string | null
          id_profissional: string
          id_salao: string
          observacoes: string | null
          origem_percentual: string | null
          pago_em: string | null
          percentual: number
          percentual_aplicado: number | null
          status: string
          tipo_destinatario: string
          tipo_profissional: string | null
          updated_at: string | null
          valor_base: number
          valor_comissao: number
          valor_comissao_assistente: number | null
        }
        Insert: {
          competencia?: string | null
          competencia_data?: string
          criado_em?: string
          descricao: string
          id?: string
          id_agendamento?: string | null
          id_assistente?: string | null
          id_comanda?: string | null
          id_comanda_item?: string | null
          id_profissional: string
          id_salao: string
          observacoes?: string | null
          origem_percentual?: string | null
          pago_em?: string | null
          percentual?: number
          percentual_aplicado?: number | null
          status?: string
          tipo_destinatario?: string
          tipo_profissional?: string | null
          updated_at?: string | null
          valor_base?: number
          valor_comissao?: number
          valor_comissao_assistente?: number | null
        }
        Update: {
          competencia?: string | null
          competencia_data?: string
          criado_em?: string
          descricao?: string
          id?: string
          id_agendamento?: string | null
          id_assistente?: string | null
          id_comanda?: string | null
          id_comanda_item?: string | null
          id_profissional?: string
          id_salao?: string
          observacoes?: string | null
          origem_percentual?: string | null
          pago_em?: string | null
          percentual?: number
          percentual_aplicado?: number | null
          status?: string
          tipo_destinatario?: string
          tipo_profissional?: string | null
          updated_at?: string | null
          valor_base?: number
          valor_comissao?: number
          valor_comissao_assistente?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_lancamentos_id_agendamento_fkey"
            columns: ["id_agendamento"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_lancamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_lancamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_lancamentos_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vw_vendas_busca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_lancamentos_id_comanda_item_fkey"
            columns: ["id_comanda_item"]
            isOneToOne: false
            referencedRelation: "comanda_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_lancamentos_id_profissional_fkey"
            columns: ["id_profissional"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_lancamentos_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_globais: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          chave: string
          descricao: string | null
          id: string
          valor_json: Json
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave: string
          descricao?: string | null
          id?: string
          valor_json?: Json
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave?: string
          descricao?: string | null
          id?: string
          valor_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_globais_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_globais_historico: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          chave: string
          id: string
          valor_anterior_json: Json | null
          valor_novo_json: Json
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave: string
          id?: string
          valor_anterior_json?: Json | null
          valor_novo_json?: Json
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave?: string
          id?: string
          valor_anterior_json?: Json | null
          valor_novo_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_globais_historico_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_salao: {
        Row: {
          cor_primaria: string | null
          created_at: string | null
          desconta_taxa_profissional: boolean | null
          dias_funcionamento: Json
          exigir_cliente_na_venda: boolean | null
          hora_abertura: string
          hora_fechamento: string
          id: string
          id_salao: string
          intervalo_minutos: number
          modo_compacto: boolean | null
          permitir_reabrir_venda: boolean | null
          repassa_taxa_cliente: boolean | null
          taxa_credito_10x: number | null
          taxa_credito_11x: number | null
          taxa_credito_12x: number | null
          taxa_credito_1x: number | null
          taxa_credito_2x: number | null
          taxa_credito_3x: number | null
          taxa_credito_4x: number | null
          taxa_credito_5x: number | null
          taxa_credito_6x: number | null
          taxa_credito_7x: number | null
          taxa_credito_8x: number | null
          taxa_credito_9x: number | null
          taxa_maquininha_boleto: number | null
          taxa_maquininha_credito: number | null
          taxa_maquininha_debito: number | null
          taxa_maquininha_outro: number | null
          taxa_maquininha_pix: number | null
          taxa_maquininha_transferencia: number | null
          updated_at: string | null
        }
        Insert: {
          cor_primaria?: string | null
          created_at?: string | null
          desconta_taxa_profissional?: boolean | null
          dias_funcionamento?: Json
          exigir_cliente_na_venda?: boolean | null
          hora_abertura?: string
          hora_fechamento?: string
          id?: string
          id_salao: string
          intervalo_minutos?: number
          modo_compacto?: boolean | null
          permitir_reabrir_venda?: boolean | null
          repassa_taxa_cliente?: boolean | null
          taxa_credito_10x?: number | null
          taxa_credito_11x?: number | null
          taxa_credito_12x?: number | null
          taxa_credito_1x?: number | null
          taxa_credito_2x?: number | null
          taxa_credito_3x?: number | null
          taxa_credito_4x?: number | null
          taxa_credito_5x?: number | null
          taxa_credito_6x?: number | null
          taxa_credito_7x?: number | null
          taxa_credito_8x?: number | null
          taxa_credito_9x?: number | null
          taxa_maquininha_boleto?: number | null
          taxa_maquininha_credito?: number | null
          taxa_maquininha_debito?: number | null
          taxa_maquininha_outro?: number | null
          taxa_maquininha_pix?: number | null
          taxa_maquininha_transferencia?: number | null
          updated_at?: string | null
        }
        Update: {
          cor_primaria?: string | null
          created_at?: string | null
          desconta_taxa_profissional?: boolean | null
          dias_funcionamento?: Json
          exigir_cliente_na_venda?: boolean | null
          hora_abertura?: string
          hora_fechamento?: string
          id?: string
          id_salao?: string
          intervalo_minutos?: number
          modo_compacto?: boolean | null
          permitir_reabrir_venda?: boolean | null
          repassa_taxa_cliente?: boolean | null
          taxa_credito_10x?: number | null
          taxa_credito_11x?: number | null
          taxa_credito_12x?: number | null
          taxa_credito_1x?: number | null
          taxa_credito_2x?: number | null
          taxa_credito_3x?: number | null
          taxa_credito_4x?: number | null
          taxa_credito_5x?: number | null
          taxa_credito_6x?: number | null
          taxa_credito_7x?: number | null
          taxa_credito_8x?: number | null
          taxa_credito_9x?: number | null
          taxa_maquininha_boleto?: number | null
          taxa_maquininha_credito?: number | null
          taxa_maquininha_debito?: number | null
          taxa_maquininha_outro?: number | null
          taxa_maquininha_pix?: number | null
          taxa_maquininha_transferencia?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_salao_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: true
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_movimentacoes: {
        Row: {
          criado_em: string
          custo_total: number | null
          custo_unitario: number | null
          id: string
          id_agendamento: string | null
          id_comanda: string | null
          id_comanda_item: string | null
          id_item_extra: string | null
          id_produto: string | null
          id_salao: string
          id_servico: string | null
          observacoes: string | null
          origem: string
          quantidade: number
          tipo_item: string
          tipo_movimento: string
          unidade_medida: string | null
        }
        Insert: {
          criado_em?: string
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          id_agendamento?: string | null
          id_comanda?: string | null
          id_comanda_item?: string | null
          id_item_extra?: string | null
          id_produto?: string | null
          id_salao: string
          id_servico?: string | null
          observacoes?: string | null
          origem: string
          quantidade?: number
          tipo_item: string
          tipo_movimento: string
          unidade_medida?: string | null
        }
        Update: {
          criado_em?: string
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          id_agendamento?: string | null
          id_comanda?: string | null
          id_comanda_item?: string | null
          id_item_extra?: string | null
          id_produto?: string | null
          id_salao?: string
          id_servico?: string | null
          observacoes?: string | null
          origem?: string
          quantidade?: number
          tipo_item?: string
          tipo_movimento?: string
          unidade_medida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_id_agendamento_fkey"
            columns: ["id_agendamento"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_id_comanda_fkey"
            columns: ["id_comanda"]
            isOneToOne: false
            referencedRelation: "vw_vendas_busca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_id_comanda_item_fkey"
            columns: ["id_comanda_item"]
            isOneToOne: false
            referencedRelation: "comanda_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_id_item_extra_fkey"
            columns: ["id_item_extra"]
            isOneToOne: false
            referencedRelation: "itens_extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_id_produto_fkey"
            columns: ["id_produto"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_id_servico_fkey"
            columns: ["id_servico"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_cron: {
        Row: {
          erro_texto: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          nome: string
          payload_json: Json
          resumo: string | null
          status: string
        }
        Insert: {
          erro_texto?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          nome: string
          payload_json?: Json
          resumo?: string | null
          status?: string
        }
        Update: {
          erro_texto?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          nome?: string
          payload_json?: Json
          resumo?: string | null
          status?: string
        }
        Relationships: []
      }
      eventos_sistema: {
        Row: {
          acao: string | null
          browser: string | null
          codigo_erro: string | null
          created_at: string
          detalhes_json: Json
          device: string | null
          eh_erro_usuario: boolean
          entidade: string | null
          entidade_id: string | null
          id: string
          id_admin_usuario: string | null
          id_salao: string | null
          id_usuario: string | null
          mensagem: string
          modulo: string
          origem: string
          response_ms: number | null
          rota: string | null
          severidade: string
          stack_resumida: string | null
          sucesso: boolean | null
          superficie: string | null
          tela: string | null
          tipo_evento: string
        }
        Insert: {
          acao?: string | null
          browser?: string | null
          codigo_erro?: string | null
          created_at?: string
          detalhes_json?: Json
          device?: string | null
          eh_erro_usuario?: boolean
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          id_admin_usuario?: string | null
          id_salao?: string | null
          id_usuario?: string | null
          mensagem: string
          modulo?: string
          origem?: string
          response_ms?: number | null
          rota?: string | null
          severidade?: string
          stack_resumida?: string | null
          sucesso?: boolean | null
          superficie?: string | null
          tela?: string | null
          tipo_evento: string
        }
        Update: {
          acao?: string | null
          browser?: string | null
          codigo_erro?: string | null
          created_at?: string
          detalhes_json?: Json
          device?: string | null
          eh_erro_usuario?: boolean
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          id_admin_usuario?: string | null
          id_salao?: string | null
          id_usuario?: string | null
          mensagem?: string
          modulo?: string
          origem?: string
          response_ms?: number | null
          rota?: string | null
          severidade?: string
          stack_resumida?: string | null
          sucesso?: boolean | null
          superficie?: string | null
          tela?: string | null
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_sistema_id_admin_usuario_fkey"
            columns: ["id_admin_usuario"]
            isOneToOne: false
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_sistema_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_sistema_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_webhook: {
        Row: {
          atualizado_em: string
          automatico: boolean
          chave: string | null
          erro_texto: string | null
          evento: string
          id: string
          id_salao: string | null
          origem: string
          payload_json: Json
          processado_em: string | null
          recebido_em: string
          resposta_json: Json
          status: string
          tentativas: number
        }
        Insert: {
          atualizado_em?: string
          automatico?: boolean
          chave?: string | null
          erro_texto?: string | null
          evento: string
          id?: string
          id_salao?: string | null
          origem?: string
          payload_json?: Json
          processado_em?: string | null
          recebido_em?: string
          resposta_json?: Json
          status?: string
          tentativas?: number
        }
        Update: {
          atualizado_em?: string
          automatico?: boolean
          chave?: string | null
          erro_texto?: string | null
          evento?: string
          id?: string
          id_salao?: string | null
          origem?: string
          payload_json?: Json
          processado_em?: string | null
          recebido_em?: string
          resposta_json?: Json
          status?: string
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "eventos_webhook_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_saloes: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          id_feature_flag: string
          id_salao: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          id_feature_flag: string
          id_salao: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          id_feature_flag?: string
          id_salao?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_saloes_id_feature_flag_fkey"
            columns: ["id_feature_flag"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_saloes_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          criado_em: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          nome: string
          planos_json: Json
          status_global: boolean
          tipo_liberacao: string
        }
        Insert: {
          criado_em?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome: string
          planos_json?: Json
          status_global?: boolean
          tipo_liberacao?: string
        }
        Update: {
          criado_em?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          planos_json?: Json
          status_global?: boolean
          tipo_liberacao?: string
        }
        Relationships: []
      }
      health_checks_sistema: {
        Row: {
          atualizado_em: string
          chave: string
          detalhes_json: Json
          id: string
          nome: string
          score: number
          status: string
        }
        Insert: {
          atualizado_em?: string
          chave: string
          detalhes_json?: Json
          id?: string
          nome: string
          score?: number
          status?: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          detalhes_json?: Json
          id?: string
          nome?: string
          score?: number
          status?: string
        }
        Relationships: []
      }
      incidentes_sistema: {
        Row: {
          acao_sugerida: string | null
          chave: string
          created_at: string
          id: string
          impacto_saloes: number
          modulo: string
          primeira_ocorrencia_em: string
          referencia_json: Json
          regra_origem: string | null
          resolucao_automatica_disponivel: boolean
          resolvido_em: string | null
          severidade: string
          status: string
          titulo: string
          total_ocorrencias: number
          ultima_ocorrencia_em: string
          updated_at: string
        }
        Insert: {
          acao_sugerida?: string | null
          chave: string
          created_at?: string
          id?: string
          impacto_saloes?: number
          modulo: string
          primeira_ocorrencia_em?: string
          referencia_json?: Json
          regra_origem?: string | null
          resolucao_automatica_disponivel?: boolean
          resolvido_em?: string | null
          severidade?: string
          status?: string
          titulo: string
          total_ocorrencias?: number
          ultima_ocorrencia_em?: string
          updated_at?: string
        }
        Update: {
          acao_sugerida?: string | null
          chave?: string
          created_at?: string
          id?: string
          impacto_saloes?: number
          modulo?: string
          primeira_ocorrencia_em?: string
          referencia_json?: Json
          regra_origem?: string | null
          resolucao_automatica_disponivel?: boolean
          resolvido_em?: string | null
          severidade?: string
          status?: string
          titulo?: string
          total_ocorrencias?: number
          ultima_ocorrencia_em?: string
          updated_at?: string
        }
        Relationships: []
      }
      itens_extras: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria: string | null
          comissao_percentual: number
          comissionavel: boolean
          controla_estoque: boolean
          criado_em: string
          custo: number
          descricao: string | null
          estoque_atual: number
          estoque_minimo: number
          id: string
          id_salao: string
          nome: string
          preco_venda: number
          unidade_medida: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string | null
          comissao_percentual?: number
          comissionavel?: boolean
          controla_estoque?: boolean
          criado_em?: string
          custo?: number
          descricao?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          id_salao: string
          nome: string
          preco_venda?: number
          unidade_medida?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string | null
          comissao_percentual?: number
          comissionavel?: boolean
          controla_estoque?: boolean
          criado_em?: string
          custo?: number
          descricao?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          id_salao?: string
          nome?: string
          preco_venda?: number
          unidade_medida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_extras_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_sistema: {
        Row: {
          criado_em: string
          detalhes_json: Json
          gravidade: string
          id: string
          id_salao: string | null
          id_usuario: string | null
          mensagem: string
          modulo: string
        }
        Insert: {
          criado_em?: string
          detalhes_json?: Json
          gravidade?: string
          id?: string
          id_salao?: string | null
          id_usuario?: string | null
          mensagem: string
          modulo?: string
        }
        Update: {
          criado_em?: string
          detalhes_json?: Json
          gravidade?: string
          id?: string
          id_salao?: string | null
          id_usuario?: string | null
          mensagem?: string
          modulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_sistema_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_sistema_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_destinos: {
        Row: {
          clicada_em: string | null
          entregue_em: string | null
          id: string
          id_notificacao: string
          id_salao: string
          lida_em: string | null
          status: string
        }
        Insert: {
          clicada_em?: string | null
          entregue_em?: string | null
          id?: string
          id_notificacao: string
          id_salao: string
          lida_em?: string | null
          status?: string
        }
        Update: {
          clicada_em?: string | null
          entregue_em?: string | null
          id?: string
          id_notificacao?: string
          id_salao?: string
          lida_em?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_destinos_id_notificacao_fkey"
            columns: ["id_notificacao"]
            isOneToOne: false
            referencedRelation: "notificacoes_globais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_destinos_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_globais: {
        Row: {
          agendada_em: string | null
          criada_em: string
          criada_por: string | null
          descricao: string
          enviada_em: string | null
          filtros_json: Json
          id: string
          imagem_url: string | null
          link_url: string | null
          publico_tipo: string
          status: string
          tipo: string
          titulo: string
        }
        Insert: {
          agendada_em?: string | null
          criada_em?: string
          criada_por?: string | null
          descricao: string
          enviada_em?: string | null
          filtros_json?: Json
          id?: string
          imagem_url?: string | null
          link_url?: string | null
          publico_tipo?: string
          status?: string
          tipo?: string
          titulo: string
        }
        Update: {
          agendada_em?: string | null
          criada_em?: string
          criada_por?: string | null
          descricao?: string
          enviada_em?: string | null
          filtros_json?: Json
          id?: string
          imagem_url?: string | null
          link_url?: string | null
          publico_tipo?: string
          status?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_globais_criada_por_fkey"
            columns: ["criada_por"]
            isOneToOne: false
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_recursos: {
        Row: {
          atualizado_em: string
          criado_em: string
          habilitado: boolean
          id: string
          id_plano: string
          limite_numero: number | null
          observacao: string | null
          recurso_codigo: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          habilitado?: boolean
          id?: string
          id_plano: string
          limite_numero?: number | null
          observacao?: string | null
          recurso_codigo: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          habilitado?: boolean
          id?: string
          id_plano?: string
          limite_numero?: number | null
          observacao?: string | null
          recurso_codigo?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_recursos_id_plano_fkey"
            columns: ["id_plano"]
            isOneToOne: false
            referencedRelation: "planos_saas"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_saas: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          cta: string | null
          descricao: string | null
          destaque: boolean | null
          id: string
          ideal_para: string | null
          limite_profissionais: number
          limite_usuarios: number
          metadata: Json | null
          nome: string
          ordem: number | null
          preco_anual: number | null
          subtitulo: string | null
          trial_dias: number | null
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          cta?: string | null
          descricao?: string | null
          destaque?: boolean | null
          id?: string
          ideal_para?: string | null
          limite_profissionais?: number
          limite_usuarios?: number
          metadata?: Json | null
          nome: string
          ordem?: number | null
          preco_anual?: number | null
          subtitulo?: string | null
          trial_dias?: number | null
          updated_at?: string
          valor_mensal?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          cta?: string | null
          descricao?: string | null
          destaque?: boolean | null
          id?: string
          ideal_para?: string | null
          limite_profissionais?: number
          limite_usuarios?: number
          metadata?: Json | null
          nome?: string
          ordem?: number | null
          preco_anual?: number | null
          subtitulo?: string | null
          trial_dias?: number | null
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      produto_servico_consumo: {
        Row: {
          ativo: boolean
          created_at: string
          custo_estimado: number | null
          id: string
          id_produto: string
          id_salao: string
          id_servico: string
          quantidade_consumo: number
          unidade_medida: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_estimado?: number | null
          id?: string
          id_produto: string
          id_salao: string
          id_servico: string
          quantidade_consumo?: number
          unidade_medida?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_estimado?: number | null
          id?: string
          id_produto?: string
          id_salao?: string
          id_servico?: string
          quantidade_consumo?: number
          unidade_medida?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_servico_consumo_id_produto_fkey"
            columns: ["id_produto"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_servico_consumo_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_servico_consumo_id_servico_fkey"
            columns: ["id_servico"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo_barras: string | null
          comissao_revenda_percentual: number
          created_at: string
          custo_por_dose: number | null
          custo_real: number | null
          custos_extras: number
          data_validade: string | null
          destinacao: string
          dose_padrao: number | null
          estoque_atual: number
          estoque_maximo: number | null
          estoque_minimo: number
          fornecedor_contato_nome: string | null
          fornecedor_nome: string | null
          fornecedor_telefone: string | null
          fornecedor_whatsapp: string | null
          foto_url: string | null
          id: string
          id_salao: string
          linha: string | null
          lote: string | null
          marca: string | null
          margem_lucro_percentual: number
          nome: string
          observacoes: string | null
          prazo_medio_entrega_dias: number | null
          preco_custo: number
          preco_venda: number
          quantidade_por_embalagem: number | null
          sku: string | null
          status: string
          unidade_dose: string | null
          unidade_medida: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          comissao_revenda_percentual?: number
          created_at?: string
          custo_por_dose?: number | null
          custo_real?: number | null
          custos_extras?: number
          data_validade?: string | null
          destinacao?: string
          dose_padrao?: number | null
          estoque_atual?: number
          estoque_maximo?: number | null
          estoque_minimo?: number
          fornecedor_contato_nome?: string | null
          fornecedor_nome?: string | null
          fornecedor_telefone?: string | null
          fornecedor_whatsapp?: string | null
          foto_url?: string | null
          id?: string
          id_salao: string
          linha?: string | null
          lote?: string | null
          marca?: string | null
          margem_lucro_percentual?: number
          nome: string
          observacoes?: string | null
          prazo_medio_entrega_dias?: number | null
          preco_custo?: number
          preco_venda?: number
          quantidade_por_embalagem?: number | null
          sku?: string | null
          status?: string
          unidade_dose?: string | null
          unidade_medida?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          comissao_revenda_percentual?: number
          created_at?: string
          custo_por_dose?: number | null
          custo_real?: number | null
          custos_extras?: number
          data_validade?: string | null
          destinacao?: string
          dose_padrao?: number | null
          estoque_atual?: number
          estoque_maximo?: number | null
          estoque_minimo?: number
          fornecedor_contato_nome?: string | null
          fornecedor_nome?: string | null
          fornecedor_telefone?: string | null
          fornecedor_whatsapp?: string | null
          foto_url?: string | null
          id?: string
          id_salao?: string
          linha?: string | null
          lote?: string | null
          marca?: string | null
          margem_lucro_percentual?: number
          nome?: string
          observacoes?: string | null
          prazo_medio_entrega_dias?: number | null
          preco_custo?: number
          preco_venda?: number
          quantidade_por_embalagem?: number | null
          sku?: string | null
          status?: string
          unidade_dose?: string | null
          unidade_medida?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_alertas: {
        Row: {
          created_at: string
          id: string
          id_produto: string
          id_salao: string
          mensagem: string
          resolved_at: string | null
          resolvido: boolean
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_produto: string
          id_salao: string
          mensagem: string
          resolved_at?: string | null
          resolvido?: boolean
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          id_produto?: string
          id_salao?: string
          mensagem?: string
          resolved_at?: string | null
          resolvido?: boolean
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_alertas_id_produto_fkey"
            columns: ["id_produto"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_alertas_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_movimentacoes: {
        Row: {
          created_at: string
          id: string
          id_produto: string
          id_salao: string
          id_usuario: string | null
          observacoes: string | null
          origem: string | null
          quantidade: number
          tipo: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          id_produto: string
          id_salao: string
          id_usuario?: string | null
          observacoes?: string | null
          origem?: string | null
          quantidade: number
          tipo: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          id_produto?: string
          id_salao?: string
          id_usuario?: string | null
          observacoes?: string | null
          origem?: string | null
          quantidade?: number
          tipo?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_movimentacoes_id_produto_fkey"
            columns: ["id_produto"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_movimentacoes_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_movimentacoes_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      profissionais: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          bio: string | null
          cargo: string | null
          categoria: string | null
          cep: string | null
          cidade: string | null
          comissao_percentual: number | null
          comissao_produto_percentual: number | null
          cor_agenda: string | null
          cpf: string | null
          data_admissao: string | null
          data_nascimento: string | null
          dias_trabalho: Json | null
          eh_assistente: boolean | null
          email: string | null
          endereco: string | null
          especialidades: string[] | null
          estado: string | null
          foto: string | null
          foto_url: string | null
          id: string
          id_profissional_principal: string | null
          id_salao: string | null
          nivel_acesso: string | null
          nome: string | null
          nome_exibicao: string | null
          nome_social: string | null
          numero: string | null
          ordem_agenda: number | null
          pausas: Json | null
          percentual_comissao_assistente: number | null
          permite_comissao: boolean | null
          pix_chave: string | null
          pix_tipo: string | null
          pode_usar_sistema: boolean | null
          recebe_comissao: boolean | null
          rg: string | null
          status: string | null
          telefone: string | null
          tipo_profissional: string | null
          tipo_vinculo: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          bio?: string | null
          cargo?: string | null
          categoria?: string | null
          cep?: string | null
          cidade?: string | null
          comissao_percentual?: number | null
          comissao_produto_percentual?: number | null
          cor_agenda?: string | null
          cpf?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          dias_trabalho?: Json | null
          eh_assistente?: boolean | null
          email?: string | null
          endereco?: string | null
          especialidades?: string[] | null
          estado?: string | null
          foto?: string | null
          foto_url?: string | null
          id?: string
          id_profissional_principal?: string | null
          id_salao?: string | null
          nivel_acesso?: string | null
          nome?: string | null
          nome_exibicao?: string | null
          nome_social?: string | null
          numero?: string | null
          ordem_agenda?: number | null
          pausas?: Json | null
          percentual_comissao_assistente?: number | null
          permite_comissao?: boolean | null
          pix_chave?: string | null
          pix_tipo?: string | null
          pode_usar_sistema?: boolean | null
          recebe_comissao?: boolean | null
          rg?: string | null
          status?: string | null
          telefone?: string | null
          tipo_profissional?: string | null
          tipo_vinculo?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          bio?: string | null
          cargo?: string | null
          categoria?: string | null
          cep?: string | null
          cidade?: string | null
          comissao_percentual?: number | null
          comissao_produto_percentual?: number | null
          cor_agenda?: string | null
          cpf?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          dias_trabalho?: Json | null
          eh_assistente?: boolean | null
          email?: string | null
          endereco?: string | null
          especialidades?: string[] | null
          estado?: string | null
          foto?: string | null
          foto_url?: string | null
          id?: string
          id_profissional_principal?: string | null
          id_salao?: string | null
          nivel_acesso?: string | null
          nome?: string | null
          nome_exibicao?: string | null
          nome_social?: string | null
          numero?: string | null
          ordem_agenda?: number | null
          pausas?: Json | null
          percentual_comissao_assistente?: number | null
          permite_comissao?: boolean | null
          pix_chave?: string | null
          pix_tipo?: string | null
          pode_usar_sistema?: boolean | null
          recebe_comissao?: boolean | null
          rg?: string | null
          status?: string | null
          telefone?: string | null
          tipo_profissional?: string | null
          tipo_vinculo?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_id_profissional_principal_fkey"
            columns: ["id_profissional_principal"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissionais_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      profissionais_acessos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cpf: string
          criado_em: string
          google_auth_user_id: string | null
          google_conectado_em: string | null
          google_email: string | null
          id: string
          id_profissional: string
          senha_hash: string
          ultimo_login_em: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cpf: string
          criado_em?: string
          google_auth_user_id?: string | null
          google_conectado_em?: string | null
          google_email?: string | null
          id?: string
          id_profissional: string
          senha_hash: string
          ultimo_login_em?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cpf?: string
          criado_em?: string
          google_auth_user_id?: string | null
          google_conectado_em?: string | null
          google_email?: string | null
          id?: string
          id_profissional?: string
          senha_hash?: string
          ultimo_login_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_acessos_id_profissional_fkey"
            columns: ["id_profissional"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      profissionais_vales: {
        Row: {
          created_at: string
          descontado_em: string | null
          descricao: string | null
          id: string
          id_comissao_lancamento: string | null
          id_movimentacao: string | null
          id_profissional: string
          id_salao: string
          id_sessao: string | null
          id_usuario: string | null
          idempotency_key: string | null
          lancado_em: string
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          descontado_em?: string | null
          descricao?: string | null
          id?: string
          id_comissao_lancamento?: string | null
          id_movimentacao?: string | null
          id_profissional: string
          id_salao: string
          id_sessao?: string | null
          id_usuario?: string | null
          idempotency_key?: string | null
          lancado_em?: string
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          descontado_em?: string | null
          descricao?: string | null
          id?: string
          id_comissao_lancamento?: string | null
          id_movimentacao?: string | null
          id_profissional?: string
          id_salao?: string
          id_sessao?: string | null
          id_usuario?: string | null
          idempotency_key?: string | null
          lancado_em?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_vales_id_movimentacao_fkey"
            columns: ["id_movimentacao"]
            isOneToOne: false
            referencedRelation: "caixa_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissionais_vales_id_sessao_fkey"
            columns: ["id_sessao"]
            isOneToOne: false
            referencedRelation: "caixa_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profissional_assistentes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          created_at: string
          criado_em: string
          id: string
          id_assistente: string
          id_profissional: string
          id_salao: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          created_at?: string
          criado_em?: string
          id?: string
          id_assistente: string
          id_profissional: string
          id_salao: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          created_at?: string
          criado_em?: string
          id?: string
          id_assistente?: string
          id_profissional?: string
          id_salao?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profissional_assistentes_id_assistente_fkey"
            columns: ["id_assistente"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissional_assistentes_id_profissional_fkey"
            columns: ["id_profissional"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissional_assistentes_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      profissional_login_rate_limits: {
        Row: {
          atualizado_em: string
          bloqueado_ate: string | null
          chave: string
          primeira_tentativa_em: string
          tentativas: number
        }
        Insert: {
          atualizado_em?: string
          bloqueado_ate?: string | null
          chave: string
          primeira_tentativa_em?: string
          tentativas?: number
        }
        Update: {
          atualizado_em?: string
          bloqueado_ate?: string | null
          chave?: string
          primeira_tentativa_em?: string
          tentativas?: number
        }
        Relationships: []
      }
      profissional_servicos: {
        Row: {
          ativo: boolean
          base_calculo: string | null
          comissao_assistente_percentual: number | null
          comissao_percentual: number | null
          created_at: string | null
          desconta_taxa_maquininha: boolean | null
          duracao_minutos: number | null
          id: string
          id_profissional: string
          id_salao: string
          id_servico: string
          ordem: number | null
          preco_personalizado: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          base_calculo?: string | null
          comissao_assistente_percentual?: number | null
          comissao_percentual?: number | null
          created_at?: string | null
          desconta_taxa_maquininha?: boolean | null
          duracao_minutos?: number | null
          id?: string
          id_profissional: string
          id_salao: string
          id_servico: string
          ordem?: number | null
          preco_personalizado?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          base_calculo?: string | null
          comissao_assistente_percentual?: number | null
          comissao_percentual?: number | null
          created_at?: string | null
          desconta_taxa_maquininha?: boolean | null
          duracao_minutos?: number | null
          id?: string
          id_profissional?: string
          id_salao?: string
          id_servico?: string
          ordem?: number | null
          preco_personalizado?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profissional_servicos_id_profissional_fkey"
            columns: ["id_profissional"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissional_servicos_id_servico_fkey"
            columns: ["id_servico"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      recursos_agenda: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          id_salao: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          id_salao: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          id_salao?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recursos_agenda_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      reprocessamentos_sistema: {
        Row: {
          criado_em: string
          entidade: string
          entidade_id: string | null
          id: string
          id_admin_usuario: string | null
          resultado_json: Json
          status: string
          tipo: string
        }
        Insert: {
          criado_em?: string
          entidade: string
          entidade_id?: string | null
          id?: string
          id_admin_usuario?: string | null
          resultado_json?: Json
          status?: string
          tipo: string
        }
        Update: {
          criado_em?: string
          entidade?: string
          entidade_id?: string | null
          id?: string
          id_admin_usuario?: string | null
          resultado_json?: Json
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "reprocessamentos_sistema_id_admin_usuario_fkey"
            columns: ["id_admin_usuario"]
            isOneToOne: false
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      saloes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          limite_profissionais: number | null
          limite_usuarios: number | null
          logo_url: string | null
          nome: string | null
          nome_fantasia: string | null
          numero: string | null
          plano: string | null
          razao_social: string | null
          renovacao_automatica: boolean
          responsavel: string | null
          status: string | null
          telefone: string | null
          tipo_pessoa: string | null
          trial_ativo: boolean | null
          trial_fim_em: string | null
          trial_inicio_em: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          limite_profissionais?: number | null
          limite_usuarios?: number | null
          logo_url?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          plano?: string | null
          razao_social?: string | null
          renovacao_automatica?: boolean
          responsavel?: string | null
          status?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          trial_ativo?: boolean | null
          trial_fim_em?: string | null
          trial_inicio_em?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          limite_profissionais?: number | null
          limite_usuarios?: number | null
          logo_url?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          plano?: string | null
          razao_social?: string | null
          renovacao_automatica?: boolean
          responsavel?: string | null
          status?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          trial_ativo?: boolean | null
          trial_fim_em?: string | null
          trial_inicio_em?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      saloes_bloqueios: {
        Row: {
          criado_em: string
          criado_por: string | null
          finalizado_em: string | null
          id: string
          id_salao: string
          iniciado_em: string
          motivo: string | null
          origem: string
          tipo_bloqueio: string
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          finalizado_em?: string | null
          id?: string
          id_salao: string
          iniciado_em?: string
          motivo?: string | null
          origem?: string
          tipo_bloqueio: string
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          finalizado_em?: string | null
          id?: string
          id_salao?: string
          iniciado_em?: string
          motivo?: string | null
          origem?: string
          tipo_bloqueio?: string
        }
        Relationships: [
          {
            foreignKeyName: "saloes_bloqueios_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      saloes_recursos_extras: {
        Row: {
          atualizado_em: string
          criado_em: string
          expira_em: string | null
          habilitado: boolean
          id: string
          id_salao: string
          origem: string
          recurso_codigo: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          expira_em?: string | null
          habilitado?: boolean
          id?: string
          id_salao: string
          origem?: string
          recurso_codigo: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          expira_em?: string | null
          habilitado?: boolean
          id?: string
          id_salao?: string
          origem?: string
          recurso_codigo?: string
        }
        Relationships: [
          {
            foreignKeyName: "saloes_recursos_extras_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      score_onboarding_salao: {
        Row: {
          atualizado_em: string
          detalhes_json: Json
          dias_com_acesso: number
          id: string
          id_salao: string
          modulos_usados: number
          score_total: number
        }
        Insert: {
          atualizado_em?: string
          detalhes_json?: Json
          dias_com_acesso?: number
          id?: string
          id_salao: string
          modulos_usados?: number
          score_total?: number
        }
        Update: {
          atualizado_em?: string
          detalhes_json?: Json
          dias_com_acesso?: number
          id?: string
          id_salao?: string
          modulos_usados?: number
          score_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "score_onboarding_salao_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: true
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      score_saude_salao: {
        Row: {
          atualizado_em: string
          id: string
          id_salao: string
          inadimplencia_risco: number
          risco_cancelamento: number
          score_total: number
          tickets_abertos: number
          uso_recente: number
        }
        Insert: {
          atualizado_em?: string
          id?: string
          id_salao: string
          inadimplencia_risco?: number
          risco_cancelamento?: number
          score_total?: number
          tickets_abertos?: number
          uso_recente?: number
        }
        Update: {
          atualizado_em?: string
          id?: string
          id_salao?: string
          inadimplencia_risco?: number
          risco_cancelamento?: number
          score_total?: number
          tickets_abertos?: number
          uso_recente?: number
        }
        Relationships: [
          {
            foreignKeyName: "score_saude_salao_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: true
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_itens_extras: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          id_item_extra: string
          id_salao: string
          id_servico: string
          obrigatorio: boolean
          observacoes: string | null
          quantidade_padrao: number
          selecionado_por_padrao: boolean
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          id_item_extra: string
          id_salao: string
          id_servico: string
          obrigatorio?: boolean
          observacoes?: string | null
          quantidade_padrao?: number
          selecionado_por_padrao?: boolean
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          id_item_extra?: string
          id_salao?: string
          id_servico?: string
          obrigatorio?: boolean
          observacoes?: string | null
          quantidade_padrao?: number
          selecionado_por_padrao?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "servico_itens_extras_id_item_extra_fkey"
            columns: ["id_item_extra"]
            isOneToOne: false
            referencedRelation: "itens_extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_itens_extras_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_itens_extras_id_servico_fkey"
            columns: ["id_servico"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          base_calculo: string | null
          categoria: string | null
          comissao_assistente_percentual: number | null
          comissao_percentual: number | null
          comissao_percentual_padrao: number | null
          created_at: string | null
          criado_em: string | null
          custo_produto: number | null
          desconta_taxa_maquininha: boolean | null
          descricao: string | null
          duracao: number | null
          duracao_minutos: number | null
          exige_avaliacao: boolean | null
          gatilho_retorno_dias: number | null
          id: string
          id_categoria: string | null
          id_salao: string | null
          nome: string | null
          pausa_minutos: number | null
          preco: number | null
          preco_minimo: number | null
          preco_padrao: number | null
          preco_variavel: boolean | null
          recurso_nome: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          base_calculo?: string | null
          categoria?: string | null
          comissao_assistente_percentual?: number | null
          comissao_percentual?: number | null
          comissao_percentual_padrao?: number | null
          created_at?: string | null
          criado_em?: string | null
          custo_produto?: number | null
          desconta_taxa_maquininha?: boolean | null
          descricao?: string | null
          duracao?: number | null
          duracao_minutos?: number | null
          exige_avaliacao?: boolean | null
          gatilho_retorno_dias?: number | null
          id?: string
          id_categoria?: string | null
          id_salao?: string | null
          nome?: string | null
          pausa_minutos?: number | null
          preco?: number | null
          preco_minimo?: number | null
          preco_padrao?: number | null
          preco_variavel?: boolean | null
          recurso_nome?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          base_calculo?: string | null
          categoria?: string | null
          comissao_assistente_percentual?: number | null
          comissao_percentual?: number | null
          comissao_percentual_padrao?: number | null
          created_at?: string | null
          criado_em?: string | null
          custo_produto?: number | null
          desconta_taxa_maquininha?: boolean | null
          descricao?: string | null
          duracao?: number | null
          duracao_minutos?: number | null
          exige_avaliacao?: boolean | null
          gatilho_retorno_dias?: number | null
          id?: string
          id_categoria?: string | null
          id_salao?: string | null
          nome?: string | null
          pausa_minutos?: number | null
          preco?: number | null
          preco_minimo?: number | null
          preco_padrao?: number | null
          preco_variavel?: boolean | null
          recurso_nome?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      servicos_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          id_salao: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          id_salao: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          id_salao?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      suporte_conversas: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          id_agendamento: string | null
          id_cliente: string | null
          id_comanda: string | null
          id_profissional: string
          id_salao: string
          origem_pagina: string | null
          titulo: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          id_agendamento?: string | null
          id_cliente?: string | null
          id_comanda?: string | null
          id_profissional: string
          id_salao: string
          origem_pagina?: string | null
          titulo?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          id_agendamento?: string | null
          id_cliente?: string | null
          id_comanda?: string | null
          id_profissional?: string
          id_salao?: string
          origem_pagina?: string | null
          titulo?: string | null
        }
        Relationships: []
      }
      suporte_mensagens: {
        Row: {
          conteudo: string
          criado_em: string
          id: string
          id_conversa: string
          metadados: Json | null
          papel: string
        }
        Insert: {
          conteudo: string
          criado_em?: string
          id?: string
          id_conversa: string
          metadados?: Json | null
          papel: string
        }
        Update: {
          conteudo?: string
          criado_em?: string
          id?: string
          id_conversa?: string
          metadados?: Json | null
          papel?: string
        }
        Relationships: [
          {
            foreignKeyName: "suporte_mensagens_id_conversa_fkey"
            columns: ["id_conversa"]
            isOneToOne: false
            referencedRelation: "suporte_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_eventos: {
        Row: {
          criado_em: string
          descricao: string | null
          evento: string
          id: string
          id_ticket: string
          payload_json: Json
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          evento: string
          id?: string
          id_ticket: string
          payload_json?: Json
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          evento?: string
          id?: string
          id_ticket?: string
          payload_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ticket_eventos_id_ticket_fkey"
            columns: ["id_ticket"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_mensagens: {
        Row: {
          anexos_json: Json
          autor_nome: string | null
          autor_tipo: string
          criada_em: string
          id: string
          id_admin_usuario: string | null
          id_profissional: string | null
          id_ticket: string
          id_usuario_salao: string | null
          interna: boolean
          mensagem: string
        }
        Insert: {
          anexos_json?: Json
          autor_nome?: string | null
          autor_tipo?: string
          criada_em?: string
          id?: string
          id_admin_usuario?: string | null
          id_profissional?: string | null
          id_ticket: string
          id_usuario_salao?: string | null
          interna?: boolean
          mensagem: string
        }
        Update: {
          anexos_json?: Json
          autor_nome?: string | null
          autor_tipo?: string
          criada_em?: string
          id?: string
          id_admin_usuario?: string | null
          id_profissional?: string | null
          id_ticket?: string
          id_usuario_salao?: string | null
          interna?: boolean
          mensagem?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_mensagens_id_admin_usuario_fkey"
            columns: ["id_admin_usuario"]
            isOneToOne: false
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_mensagens_id_profissional_fkey"
            columns: ["id_profissional"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_mensagens_id_ticket_fkey"
            columns: ["id_ticket"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_mensagens_id_usuario_salao_fkey"
            columns: ["id_usuario_salao"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assunto: string
          atualizado_em: string
          categoria: string
          criado_em: string
          fechado_em: string | null
          id: string
          id_responsavel_admin: string | null
          id_salao: string | null
          numero: number
          origem: string
          origem_contexto: Json
          prioridade: string
          sla_limite_em: string | null
          solicitante_email: string | null
          solicitante_nome: string | null
          status: string
          ultima_interacao_em: string
        }
        Insert: {
          assunto: string
          atualizado_em?: string
          categoria?: string
          criado_em?: string
          fechado_em?: string | null
          id?: string
          id_responsavel_admin?: string | null
          id_salao?: string | null
          numero?: number
          origem?: string
          origem_contexto?: Json
          prioridade?: string
          sla_limite_em?: string | null
          solicitante_email?: string | null
          solicitante_nome?: string | null
          status?: string
          ultima_interacao_em?: string
        }
        Update: {
          assunto?: string
          atualizado_em?: string
          categoria?: string
          criado_em?: string
          fechado_em?: string | null
          id?: string
          id_responsavel_admin?: string | null
          id_salao?: string | null
          numero?: number
          origem?: string
          origem_contexto?: Json
          prioridade?: string
          sla_limite_em?: string | null
          solicitante_email?: string | null
          solicitante_nome?: string | null
          status?: string
          ultima_interacao_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_id_responsavel_admin_fkey"
            columns: ["id_responsavel_admin"]
            isOneToOne: false
            referencedRelation: "admin_master_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_extensoes_automaticas: {
        Row: {
          aplicado_automaticamente: boolean
          criado_em: string
          id: string
          id_salao: string
          motivo: string | null
          score_atingido: number
          trial_novo_fim: string
          trial_original_fim: string | null
        }
        Insert: {
          aplicado_automaticamente?: boolean
          criado_em?: string
          id?: string
          id_salao: string
          motivo?: string | null
          score_atingido?: number
          trial_novo_fim: string
          trial_original_fim?: string | null
        }
        Update: {
          aplicado_automaticamente?: boolean
          criado_em?: string
          id?: string
          id_salao?: string
          motivo?: string | null
          score_atingido?: number
          trial_novo_fim?: string
          trial_original_fim?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_extensoes_automaticas_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: true
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_extensoes_regras: {
        Row: {
          ativo: boolean
          criado_em: string
          dias_extra: number
          id: string
          nome: string
          score_minimo: number
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          dias_extra?: number
          id?: string
          nome: string
          score_minimo?: number
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          dias_extra?: number
          id?: string
          nome?: string
          score_minimo?: number
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          id: string
          id_salao: string | null
          nivel: string | null
          nome: string | null
          senha: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          id_salao?: string | null
          nivel?: string | null
          nome?: string | null
          senha?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          id_salao?: string | null
          nivel?: string | null
          nome?: string | null
          senha?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      usuarios_permissoes: {
        Row: {
          agenda_criar: boolean | null
          agenda_editar: boolean | null
          agenda_excluir: boolean | null
          agenda_ver: boolean | null
          caixa_fechar: boolean | null
          caixa_operar: boolean | null
          caixa_ver: boolean | null
          clientes_criar: boolean | null
          clientes_editar: boolean | null
          clientes_excluir: boolean | null
          clientes_ver: boolean | null
          comandas_criar: boolean | null
          comandas_editar: boolean | null
          comandas_excluir: boolean | null
          comandas_ver: boolean | null
          comissoes_pagar: boolean | null
          comissoes_ver: boolean | null
          configuracoes_editar: boolean | null
          configuracoes_ver: boolean | null
          created_at: string | null
          estoque_movimentar: boolean | null
          estoque_ver: boolean | null
          id: string
          id_salao: string
          id_usuario: string
          produtos_criar: boolean | null
          produtos_editar: boolean | null
          produtos_excluir: boolean | null
          produtos_ver: boolean | null
          profissionais_criar: boolean | null
          profissionais_editar: boolean | null
          profissionais_excluir: boolean | null
          profissionais_ver: boolean | null
          relatorios_ver: boolean | null
          servicos_criar: boolean | null
          servicos_editar: boolean | null
          servicos_excluir: boolean | null
          servicos_ver: boolean | null
          updated_at: string | null
          vendas_excluir: boolean | null
          vendas_reabrir: boolean | null
          vendas_ver: boolean | null
        }
        Insert: {
          agenda_criar?: boolean | null
          agenda_editar?: boolean | null
          agenda_excluir?: boolean | null
          agenda_ver?: boolean | null
          caixa_fechar?: boolean | null
          caixa_operar?: boolean | null
          caixa_ver?: boolean | null
          clientes_criar?: boolean | null
          clientes_editar?: boolean | null
          clientes_excluir?: boolean | null
          clientes_ver?: boolean | null
          comandas_criar?: boolean | null
          comandas_editar?: boolean | null
          comandas_excluir?: boolean | null
          comandas_ver?: boolean | null
          comissoes_pagar?: boolean | null
          comissoes_ver?: boolean | null
          configuracoes_editar?: boolean | null
          configuracoes_ver?: boolean | null
          created_at?: string | null
          estoque_movimentar?: boolean | null
          estoque_ver?: boolean | null
          id?: string
          id_salao: string
          id_usuario: string
          produtos_criar?: boolean | null
          produtos_editar?: boolean | null
          produtos_excluir?: boolean | null
          produtos_ver?: boolean | null
          profissionais_criar?: boolean | null
          profissionais_editar?: boolean | null
          profissionais_excluir?: boolean | null
          profissionais_ver?: boolean | null
          relatorios_ver?: boolean | null
          servicos_criar?: boolean | null
          servicos_editar?: boolean | null
          servicos_excluir?: boolean | null
          servicos_ver?: boolean | null
          updated_at?: string | null
          vendas_excluir?: boolean | null
          vendas_reabrir?: boolean | null
          vendas_ver?: boolean | null
        }
        Update: {
          agenda_criar?: boolean | null
          agenda_editar?: boolean | null
          agenda_excluir?: boolean | null
          agenda_ver?: boolean | null
          caixa_fechar?: boolean | null
          caixa_operar?: boolean | null
          caixa_ver?: boolean | null
          clientes_criar?: boolean | null
          clientes_editar?: boolean | null
          clientes_excluir?: boolean | null
          clientes_ver?: boolean | null
          comandas_criar?: boolean | null
          comandas_editar?: boolean | null
          comandas_excluir?: boolean | null
          comandas_ver?: boolean | null
          comissoes_pagar?: boolean | null
          comissoes_ver?: boolean | null
          configuracoes_editar?: boolean | null
          configuracoes_ver?: boolean | null
          created_at?: string | null
          estoque_movimentar?: boolean | null
          estoque_ver?: boolean | null
          id?: string
          id_salao?: string
          id_usuario?: string
          produtos_criar?: boolean | null
          produtos_editar?: boolean | null
          produtos_excluir?: boolean | null
          produtos_ver?: boolean | null
          profissionais_criar?: boolean | null
          profissionais_editar?: boolean | null
          profissionais_excluir?: boolean | null
          profissionais_ver?: boolean | null
          relatorios_ver?: boolean | null
          servicos_criar?: boolean | null
          servicos_editar?: boolean | null
          servicos_excluir?: boolean | null
          servicos_ver?: boolean | null
          updated_at?: string | null
          vendas_excluir?: boolean | null
          vendas_reabrir?: boolean | null
          vendas_ver?: boolean | null
        }
        Relationships: []
      }
      usuarios_senhas_reuso: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          id_salao: string
          id_usuario: string | null
          senha_hash_reuso: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          id_salao: string
          id_usuario?: string | null
          senha_hash_reuso: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          id_salao?: string
          id_usuario?: string | null
          senha_hash_reuso?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_envios: {
        Row: {
          atualizado_em: string
          criado_em: string
          custo_creditos: number
          destino: string
          enviado_em: string | null
          erro_texto: string | null
          id: string
          id_salao: string | null
          mensagem: string
          payload_json: Json
          provider: string
          provider_message_id: string | null
          status: string
          template: string | null
          tipo: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          custo_creditos?: number
          destino: string
          enviado_em?: string | null
          erro_texto?: string | null
          id?: string
          id_salao?: string | null
          mensagem: string
          payload_json?: Json
          provider?: string
          provider_message_id?: string | null
          status?: string
          template?: string | null
          tipo?: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          custo_creditos?: number
          destino?: string
          enviado_em?: string | null
          erro_texto?: string | null
          id?: string
          id_salao?: string | null
          mensagem?: string
          payload_json?: Json
          provider?: string
          provider_message_id?: string | null
          status?: string
          template?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_envios_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_filas: {
        Row: {
          criado_em: string
          id: string
          id_salao: string | null
          payload_json: Json
          processado_em: string | null
          status: string
          tentativas: number
          ultimo_erro: string | null
        }
        Insert: {
          criado_em?: string
          id?: string
          id_salao?: string | null
          payload_json?: Json
          processado_em?: string | null
          status?: string
          tentativas?: number
          ultimo_erro?: string | null
        }
        Update: {
          criado_em?: string
          id?: string
          id_salao?: string | null
          payload_json?: Json
          processado_em?: string | null
          status?: string
          tentativas?: number
          ultimo_erro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_filas_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_pacote_saloes: {
        Row: {
          comprado_em: string
          creditos_saldo: number
          creditos_total: number
          creditos_usados: number
          expira_em: string | null
          id: string
          id_pacote: string | null
          id_salao: string
          status: string
        }
        Insert: {
          comprado_em?: string
          creditos_saldo?: number
          creditos_total?: number
          creditos_usados?: number
          expira_em?: string | null
          id?: string
          id_pacote?: string | null
          id_salao: string
          status?: string
        }
        Update: {
          comprado_em?: string
          creditos_saldo?: number
          creditos_total?: number
          creditos_usados?: number
          expira_em?: string | null
          id?: string
          id_pacote?: string | null
          id_salao?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_pacote_saloes_id_pacote_fkey"
            columns: ["id_pacote"]
            isOneToOne: false
            referencedRelation: "whatsapp_pacotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_pacote_saloes_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_pacotes: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          preco: number
          quantidade_creditos: number
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          preco?: number
          quantidade_creditos?: number
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          preco?: number
          quantidade_creditos?: number
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          ativo: boolean
          categoria: string
          conteudo: string
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          conteudo: string
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          conteudo?: string
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      vendas: {
        Row: {
          aberta_em: string | null
          acrescimo: number | null
          cancelada_em: string | null
          cliente_nome: string | null
          created_at: string | null
          desconto: number | null
          fechada_em: string | null
          id: string | null
          id_cliente: string | null
          id_salao: string | null
          numero: number | null
          status: string | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comandas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_vendas_busca: {
        Row: {
          aberta_em: string | null
          acrescimo: number | null
          cancelada_em: string | null
          cliente_nome: string | null
          desconto: number | null
          fechada_em: string | null
          formas_pagamento: string | null
          id: string | null
          id_cliente: string | null
          id_salao: string | null
          itens_descricoes: string | null
          numero: number | null
          profissionais_nomes: string | null
          status: string | null
          subtotal: number | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comandas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_id_salao_fkey"
            columns: ["id_salao"]
            isOneToOne: false
            referencedRelation: "saloes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aplicar_permissoes_padrao_usuario: {
        Args: { p_id_salao: string; p_id_usuario: string; p_nivel: string }
        Returns: undefined
      }
      comanda_status_bloqueado: {
        Args: { p_id_comanda: string }
        Returns: boolean
      }
      fn_observability_retention_cleanup: {
        Args: {
          p_acoes_automaticas_days?: number
          p_auditoria_logs_days?: number
          p_batch_limit?: number
          p_eventos_cron_days?: number
          p_eventos_sistema_days?: number
          p_eventos_webhook_days?: number
          p_logs_sistema_days?: number
        }
        Returns: {
          deleted_count: number
          table_name: string
        }[]
      }
      fn_adicionar_item_comanda: {
        Args: {
          p_acrescimo?: number
          p_base_calculo: string
          p_comissao_assistente_percentual: number
          p_comissao_percentual: number
          p_custo_total: number
          p_desconta_taxa_maquininha: boolean
          p_desconto?: number
          p_descricao: string
          p_id_agendamento: string
          p_id_assistente: string
          p_id_comanda: string
          p_id_produto: string
          p_id_profissional: string
          p_id_salao: string
          p_id_servico: string
          p_observacoes: string
          p_origem: string
          p_quantidade: number
          p_tipo_item: string
          p_valor_unitario: number
        }
        Returns: string
      }
      fn_adicionar_item_comanda_idempotente: {
        Args: {
          p_acrescimo?: number
          p_base_calculo: string
          p_comissao_assistente_percentual: number
          p_comissao_percentual: number
          p_custo_total: number
          p_desconta_taxa_maquininha: boolean
          p_desconto?: number
          p_descricao: string
          p_id_agendamento: string
          p_id_assistente: string
          p_id_comanda: string
          p_id_produto: string
          p_id_profissional: string
          p_id_salao: string
          p_id_servico: string
          p_idempotency_key?: string
          p_observacoes: string
          p_origem: string
          p_quantidade: number
          p_tipo_item: string
          p_valor_unitario: number
        }
        Returns: {
          id_item: string
          ja_existia: boolean
        }[]
      }
      fn_admin_master_avaliar_extensao_trial: {
        Args: { p_id_salao?: string }
        Returns: {
          aplicado: boolean
          id_salao: string
          mensagem: string
          score: number
        }[]
      }
      fn_admin_master_calcular_score_onboarding: {
        Args: { p_id_salao: string }
        Returns: number
      }
      fn_admin_master_registrar_auditoria: {
        Args: {
          p_acao: string
          p_descricao?: string
          p_entidade: string
          p_entidade_id?: string
          p_id_admin_usuario: string
          p_ip?: string
          p_payload_json?: Json
          p_user_agent?: string
        }
        Returns: string
      }
      fn_asaas_webhook_event_order: {
        Args: { p_evento: string; p_payment_status: string }
        Returns: number
      }
      fn_assinatura_concluir_checkout: {
        Args: {
          p_asaas_payment_id: string
          p_checkout_lock_id: string
          p_id_cobranca: string
          p_response_json?: Json
        }
        Returns: undefined
      }
      fn_assinatura_falhar_checkout: {
        Args: {
          p_asaas_payment_id?: string
          p_checkout_lock_id: string
          p_erro_texto: string
          p_response_json?: Json
        }
        Returns: undefined
      }
      fn_assinatura_reservar_checkout: {
        Args: {
          p_billing_type: string
          p_id_salao: string
          p_idempotency_key: string
          p_payload?: Json
          p_plano_codigo: string
          p_valor: number
        }
        Returns: {
          checkout_lock_id: string
          existing_cobranca_id: string
          reason: string
          should_process: boolean
        }[]
      }
      fn_atualizar_item_comanda: {
        Args: {
          p_acrescimo?: number
          p_base_calculo: string
          p_comissao_assistente_percentual: number
          p_comissao_percentual: number
          p_custo_total: number
          p_desconta_taxa_maquininha: boolean
          p_desconto?: number
          p_descricao: string
          p_id_agendamento: string
          p_id_assistente: string
          p_id_comanda: string
          p_id_item: string
          p_id_produto: string
          p_id_profissional: string
          p_id_salao: string
          p_id_servico: string
          p_observacoes: string
          p_origem: string
          p_quantidade: number
          p_tipo_item: string
          p_valor_unitario: number
        }
        Returns: undefined
      }
      fn_auth_user_id: { Args: never; Returns: string }
      fn_baixar_estoque_consumo_servicos: {
        Args: { p_id_comanda: string }
        Returns: undefined
      }
      fn_baixar_estoque_itens_comanda: {
        Args: { p_id_comanda: string }
        Returns: undefined
      }
      fn_cadastrar_salao_transacional: {
        Args: {
          p_auth_user_id: string
          p_bairro?: string
          p_cep?: string
          p_cidade?: string
          p_complemento?: string
          p_cpf_cnpj?: string
          p_email: string
          p_endereco?: string
          p_estado?: string
          p_nome_salao: string
          p_numero?: string
          p_origem?: string
          p_plano_interesse?: string
          p_responsavel: string
          p_whatsapp?: string
        }
        Returns: {
          id_salao: string
        }[]
      }
      fn_caixa_abrir_sessao: {
        Args: {
          p_id_salao: string
          p_id_usuario: string
          p_observacoes?: string
          p_valor_abertura: number
        }
        Returns: string
      }
      fn_caixa_adicionar_pagamento_comanda: {
        Args: {
          p_forma_pagamento: string
          p_id_comanda: string
          p_id_salao: string
          p_id_sessao: string
          p_id_usuario: string
          p_observacoes: string
          p_parcelas: number
          p_taxa_percentual: number
          p_taxa_valor: number
          p_valor: number
        }
        Returns: {
          id_movimentacao: string
          id_pagamento: string
        }[]
      }
      fn_caixa_adicionar_pagamento_comanda_idempotente: {
        Args: {
          p_forma_pagamento: string
          p_id_comanda: string
          p_id_salao: string
          p_id_sessao: string
          p_id_usuario: string
          p_idempotency_key?: string
          p_observacoes: string
          p_parcelas: number
          p_taxa_percentual: number
          p_taxa_valor: number
          p_valor: number
        }
        Returns: {
          id_movimentacao: string
          id_pagamento: string
          ja_existia: boolean
        }[]
      }
      fn_caixa_cancelar_comanda: {
        Args: { p_id_comanda: string; p_id_salao: string; p_motivo?: string }
        Returns: string
      }
      fn_caixa_fechar_sessao: {
        Args: {
          p_id_salao: string
          p_id_sessao: string
          p_id_usuario: string
          p_observacoes?: string
          p_valor_fechamento: number
        }
        Returns: string
      }
      fn_caixa_finalizar_comanda: {
        Args: {
          p_exigir_cliente?: boolean
          p_id_comanda: string
          p_id_salao: string
        }
        Returns: string
      }
      fn_caixa_lancar_movimentacao: {
        Args: {
          p_descricao?: string
          p_forma_pagamento?: string
          p_id_comanda?: string
          p_id_profissional?: string
          p_id_salao: string
          p_id_sessao: string
          p_id_usuario: string
          p_tipo: string
          p_valor: number
        }
        Returns: {
          id_movimentacao: string
          id_vale: string
        }[]
      }
      fn_caixa_lancar_movimentacao_idempotente: {
        Args: {
          p_descricao?: string
          p_forma_pagamento?: string
          p_id_comanda?: string
          p_id_profissional?: string
          p_id_salao: string
          p_id_sessao: string
          p_id_usuario: string
          p_idempotency_key?: string
          p_tipo: string
          p_valor: number
        }
        Returns: {
          id_movimentacao: string
          id_vale: string
          ja_existia: boolean
        }[]
      }
      fn_caixa_remover_pagamento_comanda: {
        Args: {
          p_id_comanda: string
          p_id_pagamento: string
          p_id_salao: string
        }
        Returns: {
          id_movimentacao: string
          id_pagamento: string
        }[]
      }
      fn_cancelar_comanda: {
        Args: { p_id_comanda: string; p_motivo?: string }
        Returns: Json
      }
      fn_confirmar_pagamento_assinatura: {
        Args: { p_id_cobranca: string }
        Returns: Json
      }
      fn_criar_assinatura_inicial_salao: {
        Args: {
          p_codigo_plano?: string
          p_id_salao: string
          p_trial_dias?: number
        }
        Returns: Json
      }
      fn_criar_comanda_por_agendamento: {
        Args: { p_id_agendamento: string }
        Returns: string
      }
      fn_custo_unitario_produto_json: {
        Args: { p_fallback?: number; p_produto_json: Json }
        Returns: number
      }
      fn_detalhes_venda: { Args: { p_id_comanda: string }; Returns: Json }
      fn_enviar_comanda_para_pagamento: {
        Args: {
          p_acrescimo: number
          p_desconto: number
          p_id_cliente: string
          p_id_comanda: string
          p_id_salao: string
          p_observacoes: string
        }
        Returns: undefined
      }
      fn_excluir_produto_catalogo: {
        Args: { p_id_produto: string; p_id_salao: string }
        Returns: undefined
      }
      fn_excluir_servico_catalogo: {
        Args: { p_id_salao: string; p_id_servico: string }
        Returns: undefined
      }
      fn_excluir_venda_completa: {
        Args: { p_deleted_by?: string; p_id_comanda: string; p_motivo?: string }
        Returns: undefined
      }
      fn_fechar_comanda: { Args: { p_id_comanda: string }; Returns: undefined }
      fn_finalizar_agendamentos_da_comanda: {
        Args: { p_id_comanda: string }
        Returns: undefined
      }
      fn_gerar_comissoes_comanda: {
        Args: { p_id_comanda: string }
        Returns: undefined
      }
      fn_get_or_create_servico_categoria: {
        Args: { p_id_salao: string; p_nome: string }
        Returns: {
          id: string
          nome: string
        }[]
      }
      fn_id_salao_atual: { Args: never; Returns: string }
      fn_limpar_comissoes_comanda: {
        Args: { p_id_comanda: string }
        Returns: undefined
      }
      fn_processar_comissoes_lancamentos: {
        Args: { p_acao: string; p_id_salao: string; p_ids: string[] }
        Returns: {
          ids_processados: string[]
          total_lancamentos: number
          total_profissionais_com_vales: number
          total_vales: number
        }[]
      }
      fn_processar_estoque_comanda_atomic: {
        Args: {
          p_id_comanda: string
          p_id_salao: string
          p_id_usuario?: string
        }
        Returns: Json
      }
      fn_reabrir_venda_para_caixa: {
        Args: {
          p_id_comanda: string
          p_motivo?: string
          p_reopened_by?: string
        }
        Returns: undefined
      }
      fn_recalcular_total_comanda: {
        Args: {
          p_acrescimo?: number
          p_desconto?: number
          p_id_comanda: string
        }
        Returns: {
          acrescimo: number
          desconto: number
          subtotal: number
          total: number
        }[]
      }
      fn_registrar_asaas_webhook_evento: {
        Args: {
          p_evento: string
          p_fingerprint: string
          p_payload: Json
          p_payment_id: string
          p_payment_status: string
        }
        Returns: {
          id: string
          should_process: boolean
          status_processamento: string
          tentativas: number
        }[]
      }
      fn_registrar_movimentacao_estoque_manual: {
        Args: {
          p_id_produto: string
          p_id_salao: string
          p_id_usuario: string
          p_observacoes?: string
          p_origem: string
          p_quantidade: number
          p_tipo: string
          p_valor_unitario?: number
        }
        Returns: {
          estoque_atual: number
          id_movimentacao: string
        }[]
      }
      fn_remover_item_comanda: {
        Args: {
          p_acrescimo?: number
          p_desconto?: number
          p_id_comanda: string
          p_id_item: string
          p_id_salao: string
        }
        Returns: undefined
      }
      fn_reverter_estoque_comanda_atomic: {
        Args: { p_id_comanda: string; p_id_salao: string }
        Returns: Json
      }
      fn_salvar_comanda_base: {
        Args: {
          p_acrescimo: number
          p_desconto: number
          p_id_cliente: string
          p_id_comanda: string
          p_id_salao: string
          p_numero: number
          p_observacoes: string
          p_status: string
        }
        Returns: string
      }
      fn_salvar_servico_catalogo_transacional: {
        Args: {
          p_consumos?: Json
          p_id_salao: string
          p_id_servico: string
          p_servico: Json
          p_vinculos?: Json
        }
        Returns: {
          id_servico: string
        }[]
      }
      fn_shell_resumo_painel: { Args: never; Returns: Json }
      fn_sync_alerta_estoque_produto: {
        Args: {
          p_estoque_atual: number
          p_id_produto: string
          p_id_salao: string
        }
        Returns: undefined
      }
      fn_sync_item_comanda_agendamento: {
        Args: { p_id_agendamento: string }
        Returns: Json
      }
      fn_total_pagamentos_comanda: {
        Args: { p_id_comanda: string }
        Returns: number
      }
      fn_usuario_admin: { Args: never; Returns: boolean }
      fn_usuario_ativo: { Args: never; Returns: boolean }
      fn_usuario_atual: {
        Args: never
        Returns: {
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          id: string
          id_salao: string | null
          nivel: string | null
          nome: string | null
          senha: string | null
          status: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "usuarios"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_usuario_mesmo_salao: {
        Args: { target_id_salao: string }
        Returns: boolean
      }
      fn_usuario_nivel: { Args: never; Returns: string }
      fn_usuario_pertence_ao_salao: {
        Args: { p_id_salao: string }
        Returns: boolean
      }
      fn_usuario_salao_logado: { Args: never; Returns: string }
      fn_validar_funcoes_obrigatorias: {
        Args: { p_function_names: string[] }
        Returns: {
          function_exists: boolean
          function_name: string
        }[]
      }
      fn_validar_rls_critico: {
        Args: never
        Returns: {
          rls_habilitado: boolean
          tabela: string
        }[]
      }
      gerar_backup_salao: { Args: { p_id_salao: string }; Returns: Json }
      get_meu_id_salao: { Args: never; Returns: string }
      get_my_permissions: {
        Args: never
        Returns: {
          agenda_criar: boolean | null
          agenda_editar: boolean | null
          agenda_excluir: boolean | null
          agenda_ver: boolean | null
          caixa_fechar: boolean | null
          caixa_operar: boolean | null
          caixa_ver: boolean | null
          clientes_criar: boolean | null
          clientes_editar: boolean | null
          clientes_excluir: boolean | null
          clientes_ver: boolean | null
          comandas_criar: boolean | null
          comandas_editar: boolean | null
          comandas_excluir: boolean | null
          comandas_ver: boolean | null
          comissoes_pagar: boolean | null
          comissoes_ver: boolean | null
          configuracoes_editar: boolean | null
          configuracoes_ver: boolean | null
          created_at: string | null
          estoque_movimentar: boolean | null
          estoque_ver: boolean | null
          id: string
          id_salao: string
          id_usuario: string
          produtos_criar: boolean | null
          produtos_editar: boolean | null
          produtos_excluir: boolean | null
          produtos_ver: boolean | null
          profissionais_criar: boolean | null
          profissionais_editar: boolean | null
          profissionais_excluir: boolean | null
          profissionais_ver: boolean | null
          relatorios_ver: boolean | null
          servicos_criar: boolean | null
          servicos_editar: boolean | null
          servicos_excluir: boolean | null
          servicos_ver: boolean | null
          updated_at: string | null
          vendas_excluir: boolean | null
          vendas_reabrir: boolean | null
          vendas_ver: boolean | null
        }[]
        SetofOptions: {
          from: "*"
          to: "usuarios_permissoes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_salao_id: { Args: never; Returns: string }
      get_my_user_nivel: { Args: never; Returns: string }
      limpar_profissional_login_rate_limits_expirados: {
        Args: never
        Returns: undefined
      }
      recalcular_totais_comanda: {
        Args: { p_id_comanda: string }
        Returns: undefined
      }
      recalcular_total_comanda: {
        Args: { p_id_comanda: string }
        Returns: undefined
      }
      registrar_auditoria: {
        Args: {
          p_acao: string
          p_dados_anteriores?: Json
          p_dados_novos?: Json
          p_descricao?: string
          p_entidade: string
          p_entidade_id: string
          p_id_salao: string
          p_metadata?: Json
          p_modulo: string
        }
        Returns: undefined
      }
      restaurar_backup_salao: {
        Args: { p_backup_id: string }
        Returns: undefined
      }
      salvar_backup_salao: {
        Args: { p_descricao?: string; p_id_salao: string }
        Returns: string
      }
      ticket_usuario_tem_acesso: {
        Args: { p_id_ticket: string }
        Returns: boolean
      }
      unaccent: { Args: { "": string }; Returns: string }
      usuario_pode_operar_caixa: {
        Args: { p_id_salao: string }
        Returns: boolean
      }
      usuario_pode_ver_suporte: {
        Args: { p_id_salao: string }
        Returns: boolean
      }
      usuario_tem_acesso_salao: {
        Args: { p_id_salao: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
