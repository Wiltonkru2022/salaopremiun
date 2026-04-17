export type MonitoringSeverity =
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "critical";

export type MonitoringOrigin =
  | "client"
  | "server"
  | "api"
  | "server_action"
  | "webhook"
  | "cron"
  | "integration";

export type MonitoringSurface =
  | "painel"
  | "admin_master"
  | "app_profissional"
  | "public"
  | "unknown";

export type MonitoringEventKind =
  | "action_started"
  | "action_succeeded"
  | "action_failed"
  | "page_view"
  | "ui_event"
  | "metric"
  | "error";

export type MonitoringActorType =
  | "usuario_salao"
  | "admin_master"
  | "profissional"
  | "anonimo"
  | "sistema";

export type MonitoringPayload = {
  module: string;
  message: string;
  eventType?: string;
  action?: string | null;
  entity?: string | null;
  entityId?: string | null;
  severity?: MonitoringSeverity;
  origin?: MonitoringOrigin;
  surface?: MonitoringSurface;
  route?: string | null;
  screen?: string | null;
  actorType?: MonitoringActorType;
  idSalao?: string | null;
  idUsuario?: string | null;
  idAdminUsuario?: string | null;
  details?: Record<string, unknown>;
  responseMs?: number | null;
  success?: boolean | null;
  isUserError?: boolean | null;
  errorCode?: string | null;
  stack?: string | null;
  browser?: string | null;
  device?: string | null;
};
