export type ComandaResumo = {
  id: string;
  numero: number;
  status: string;
  id_cliente?: string | null;
};

export type AgendaPageTone = "default" | "danger" | "warning";

export type AgendaPageNoticeState = {
  open: boolean;
  title: string;
  message: string;
  tone: AgendaPageTone;
  redirectTo?: string | null;
};

export type AgendaPageConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone: AgendaPageTone;
  onConfirm?: (() => Promise<void>) | null;
};

export type AgendaPageReasonState = {
  open: boolean;
  title: string;
  message: string;
  value: string;
  onConfirm?: ((value: string) => Promise<void>) | null;
};
