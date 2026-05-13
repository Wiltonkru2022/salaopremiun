export type ProfissionalAppNotification = {
  id: string;
  title: string;
  description: string;
  createdAt: string | null;
  type?: string;
  status?: string | null;
  actionLabel?: string;
  href?: string;
};
