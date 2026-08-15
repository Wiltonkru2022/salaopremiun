export type UsuarioPainel = {
  id: string;
  id_salao: string;
  nome: string | null;
  email: string | null;
  nivel: string | null;
  status: string | null;
};

export type Salao = {
  id: string;
  nome?: string | null;
  nome_salao?: string | null;
  responsavel?: string | null;
  logo_url?: string | null;
  plano?: string | null;
  assinatura_status?: string | null;
};

export type AppSession = {
  userId: string;
  email: string | null;
  usuario: UsuarioPainel;
  salao: Salao | null;
};

export type AnyRow = Record<string, unknown>;

export type ModuleKey =
  | "dashboard"
  | "agenda"
  | "caixa"
  | "comandas"
  | "clientes"
  | "servicos"
  | "produtos"
  | "profissionais"
  | "estoque"
  | "comissoes"
  | "vendas"
  | "marketing"
  | "configuracoes"
  | "perfil"
  | "assinatura"
  | "relatorios"
  | "suporte";
