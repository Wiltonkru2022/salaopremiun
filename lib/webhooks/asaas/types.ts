export type PlanoSaasRow = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor_mensal: number | string;
  limite_usuarios: number | null;
  limite_profissionais: number | null;
  ativo: boolean;
};

export type WebhookRegistroRow = {
  id: string;
  should_process: boolean;
  status_processamento: string;
  tentativas: number;
};

export type WebhookEventoExistenteRow = {
  id: string;
  status_processamento: string | null;
  tentativas: number | null;
  erro_mensagem?: string | null;
  processado_em?: string | null;
};
