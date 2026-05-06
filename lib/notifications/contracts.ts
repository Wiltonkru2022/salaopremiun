export type ShellNotificationTone =
  | "danger"
  | "warning"
  | "success"
  | "info"
  | "neutral";

export type ShellNotificationCategory =
  | "assinatura"
  | "agenda"
  | "aniversario"
  | "caixa"
  | "estoque"
  | "marketing"
  | "onboarding"
  | "suporte"
  | "sistema"
  | "webhook";

export type ShellNotificationSeverity = "low" | "medium" | "high" | "critical";

export type ShellNotificationIcon =
  | "alert"
  | "agenda"
  | "assinatura"
  | "aniversario"
  | "caixa"
  | "estoque"
  | "marketing"
  | "onboarding"
  | "suporte"
  | "webhook";

export type ShellNotificationDestination = "internal" | "help" | "external";

export type ShellNotification = {
  id: string;
  title: string;
  description: string;
  tone: ShellNotificationTone;
  category: ShellNotificationCategory;
  severity: ShellNotificationSeverity;
  eventType: string;
  href?: string;
  actionLabel?: string;
  destination?: ShellNotificationDestination;
  icon?: ShellNotificationIcon;
  sourceModule?: string;
  sourceEntity?: string;
  sourceEntityId?: string;
  persistUntilResolved?: boolean;
  expiresAt?: string | null;
  critical?: boolean;
};

export type ShellNotificationsResponse = {
  notifications: ShellNotification[];
};

export type ClienteNascimento = {
  id: string;
  nome?: string | null;
  data_nascimento?: string | null;
};

export type AgendamentoNotificacao = {
  id: string;
  status?: string | null;
  data?: string | null;
  hora_inicio?: string | null;
  origem?: string | null;
  cliente_nome?: string | null;
  servico_nome?: string | null;
};

export type CaixaMovimentoNotificacao = {
  id: string;
  tipo?: string | null;
  valor?: number | null;
  created_at?: string | null;
};

export type TicketNotificacao = {
  id: string;
  numero?: number | string | null;
  assunto?: string | null;
  prioridade?: string | null;
  status?: string | null;
  ultima_interacao_em?: string | null;
};

export type EstoqueAlertaNotificacao = {
  id: string;
  tipo?: string | null;
  mensagem?: string | null;
};

export type SistemaAlertaNotificacao = {
  id: string;
  tipo?: string | null;
  gravidade?: string | null;
  origem_modulo?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  updated_at?: string | null;
  criado_em?: string | null;
};

export type OnboardingScoreNotificacao = {
  score_total?: number | null;
  dias_com_acesso?: number | null;
  modulos_usados?: number | null;
  detalhes_json?: Record<string, unknown> | null;
};
