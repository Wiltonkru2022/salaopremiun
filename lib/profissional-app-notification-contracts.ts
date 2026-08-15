export type ProfissionalAppNotification = {
  id: string;
  title: string;
  description: string;
  createdAt: string | null;
  readAt?: string | null;
  read?: boolean;
  type?: string;
  status?: string | null;
  actionLabel?: string;
  href?: string;
};
