create extension if not exists pgcrypto;

alter table public.planos_saas
  add column if not exists subtitulo text,
  add column if not exists preco_anual numeric(12, 2),
  add column if not exists destaque boolean default false,
  add column if not exists ordem integer default 0,
  add column if not exists trial_dias integer default 7,
  add column if not exists ideal_para text,
  add column if not exists cta text,
  add column if not exists metadata jsonb default '{}'::jsonb;

create table if not exists public.planos_recursos (
  id uuid primary key default gen_random_uuid(),
  id_plano uuid not null references public.planos_saas(id) on delete cascade,
  recurso_codigo text not null,
  habilitado boolean not null default true,
  limite_numero integer,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id_plano, recurso_codigo)
);

create index if not exists planos_recursos_recurso_idx
  on public.planos_recursos (recurso_codigo);

create table if not exists public.saloes_recursos_extras (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  recurso_codigo text not null,
  habilitado boolean not null default true,
  origem text not null default 'admin_master',
  expira_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id_salao, recurso_codigo)
);

create table if not exists public.saloes_bloqueios (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  tipo_bloqueio text not null,
  motivo text,
  origem text not null default 'admin_master',
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  criado_por uuid,
  criado_em timestamptz not null default now()
);

create index if not exists saloes_bloqueios_ativos_idx
  on public.saloes_bloqueios (id_salao, tipo_bloqueio)
  where finalizado_em is null;

create table if not exists public.admin_master_usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  nome text not null,
  email text not null unique,
  perfil text not null default 'analista',
  status text not null default 'ativo',
  ultimo_acesso_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.admin_master_permissoes (
  id uuid primary key default gen_random_uuid(),
  id_admin_master_usuario uuid not null unique references public.admin_master_usuarios(id) on delete cascade,
  dashboard_ver boolean not null default false,
  saloes_ver boolean not null default false,
  saloes_editar boolean not null default false,
  saloes_entrar_como boolean not null default false,
  assinaturas_ver boolean not null default false,
  assinaturas_ajustar boolean not null default false,
  cobrancas_ver boolean not null default false,
  cobrancas_reprocessar boolean not null default false,
  financeiro_ver boolean not null default false,
  operacao_ver boolean not null default false,
  operacao_reprocessar boolean not null default false,
  suporte_ver boolean not null default false,
  tickets_ver boolean not null default false,
  tickets_editar boolean not null default false,
  produto_ver boolean not null default false,
  planos_editar boolean not null default false,
  recursos_editar boolean not null default false,
  feature_flags_editar boolean not null default false,
  comunicacao_ver boolean not null default false,
  notificacoes_editar boolean not null default false,
  campanhas_editar boolean not null default false,
  whatsapp_ver boolean not null default false,
  whatsapp_editar boolean not null default false,
  relatorios_ver boolean not null default false,
  usuarios_admin_ver boolean not null default false,
  usuarios_admin_editar boolean not null default false,
  auditoria_ver boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.admin_master_auditoria (
  id uuid primary key default gen_random_uuid(),
  id_admin_usuario uuid references public.admin_master_usuarios(id) on delete set null,
  acao text not null,
  entidade text not null,
  entidade_id text,
  descricao text,
  payload_json jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  criado_em timestamptz not null default now()
);

create table if not exists public.admin_master_anotacoes_salao (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_admin_usuario uuid references public.admin_master_usuarios(id) on delete set null,
  titulo text not null,
  nota text not null,
  interna boolean not null default true,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create table if not exists public.admin_master_tags_salao (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  cor text not null default '#111827',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.admin_master_salao_tags (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_tag uuid not null references public.admin_master_tags_salao(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (id_salao, id_tag)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  numero bigserial unique,
  id_salao uuid references public.saloes(id) on delete set null,
  assunto text not null,
  categoria text not null default 'suporte',
  prioridade text not null default 'media',
  status text not null default 'aberto',
  id_responsavel_admin uuid references public.admin_master_usuarios(id) on delete set null,
  origem text not null default 'admin_master',
  sla_limite_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  fechado_em timestamptz
);

create table if not exists public.ticket_mensagens (
  id uuid primary key default gen_random_uuid(),
  id_ticket uuid not null references public.tickets(id) on delete cascade,
  autor_tipo text not null default 'admin',
  id_admin_usuario uuid references public.admin_master_usuarios(id) on delete set null,
  id_usuario_salao uuid references public.usuarios(id) on delete set null,
  mensagem text not null,
  interna boolean not null default false,
  criada_em timestamptz not null default now()
);

create table if not exists public.ticket_eventos (
  id uuid primary key default gen_random_uuid(),
  id_ticket uuid not null references public.tickets(id) on delete cascade,
  evento text not null,
  descricao text,
  payload_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists public.notificacoes_globais (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null,
  tipo text not null default 'informacao',
  publico_tipo text not null default 'todos',
  filtros_json jsonb not null default '{}'::jsonb,
  link_url text,
  imagem_url text,
  status text not null default 'rascunho',
  agendada_em timestamptz,
  enviada_em timestamptz,
  criada_em timestamptz not null default now(),
  criada_por uuid references public.admin_master_usuarios(id) on delete set null
);

create table if not exists public.notificacoes_destinos (
  id uuid primary key default gen_random_uuid(),
  id_notificacao uuid not null references public.notificacoes_globais(id) on delete cascade,
  id_salao uuid not null references public.saloes(id) on delete cascade,
  entregue_em timestamptz,
  lida_em timestamptz,
  clicada_em timestamptz,
  status text not null default 'pendente',
  unique (id_notificacao, id_salao)
);

create table if not exists public.campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'retencao',
  objetivo text,
  publico_tipo text not null default 'todos',
  filtros_json jsonb not null default '{}'::jsonb,
  status text not null default 'rascunho',
  inicio_em timestamptz,
  fim_em timestamptz,
  criado_por uuid references public.admin_master_usuarios(id) on delete set null,
  criada_em timestamptz not null default now()
);

create table if not exists public.campanha_destinos (
  id uuid primary key default gen_random_uuid(),
  id_campanha uuid not null references public.campanhas(id) on delete cascade,
  id_salao uuid not null references public.saloes(id) on delete cascade,
  status text not null default 'pendente',
  entregue_em timestamptz,
  resultado_json jsonb not null default '{}'::jsonb,
  unique (id_campanha, id_salao)
);

create table if not exists public.alertas_sistema (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  gravidade text not null default 'media',
  origem_modulo text not null default 'sistema',
  id_salao uuid references public.saloes(id) on delete cascade,
  titulo text not null,
  descricao text,
  payload_json jsonb not null default '{}'::jsonb,
  resolvido boolean not null default false,
  resolvido_por uuid references public.admin_master_usuarios(id) on delete set null,
  resolvido_em timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists public.whatsapp_pacotes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  quantidade_creditos integer not null default 0,
  preco numeric(12, 2) not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.whatsapp_pacote_saloes (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_pacote uuid references public.whatsapp_pacotes(id) on delete set null,
  creditos_total integer not null default 0,
  creditos_usados integer not null default 0,
  creditos_saldo integer not null default 0,
  status text not null default 'ativo',
  comprado_em timestamptz not null default now(),
  expira_em timestamptz
);

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null default 'geral',
  conteudo text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.whatsapp_envios (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid references public.saloes(id) on delete cascade,
  tipo text not null default 'manual',
  destino text not null,
  template text,
  mensagem text not null,
  status text not null default 'pendente',
  custo_creditos integer not null default 1,
  enviado_em timestamptz,
  erro_texto text,
  criado_em timestamptz not null default now()
);

create table if not exists public.whatsapp_filas (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid references public.saloes(id) on delete cascade,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'pendente',
  tentativas integer not null default 0,
  ultimo_erro text,
  criado_em timestamptz not null default now(),
  processado_em timestamptz
);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  status_global boolean not null default false,
  tipo_liberacao text not null default 'manual',
  planos_json jsonb not null default '[]'::jsonb,
  data_inicio timestamptz,
  data_fim timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists public.feature_flag_saloes (
  id uuid primary key default gen_random_uuid(),
  id_feature_flag uuid not null references public.feature_flags(id) on delete cascade,
  id_salao uuid not null references public.saloes(id) on delete cascade,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (id_feature_flag, id_salao)
);

create table if not exists public.configuracoes_globais (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  valor_json jsonb not null default '{}'::jsonb,
  descricao text,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.admin_master_usuarios(id) on delete set null
);

create table if not exists public.configuracoes_globais_historico (
  id uuid primary key default gen_random_uuid(),
  chave text not null,
  valor_anterior_json jsonb,
  valor_novo_json jsonb not null default '{}'::jsonb,
  atualizado_por uuid references public.admin_master_usuarios(id) on delete set null,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.eventos_webhook (
  id uuid primary key default gen_random_uuid(),
  origem text not null default 'asaas',
  evento text not null,
  id_salao uuid references public.saloes(id) on delete set null,
  status text not null default 'pendente',
  payload_json jsonb not null default '{}'::jsonb,
  resposta_json jsonb not null default '{}'::jsonb,
  erro_texto text,
  tentativas integer not null default 0,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz
);

create table if not exists public.eventos_cron (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  status text not null default 'pendente',
  resumo text,
  payload_json jsonb not null default '{}'::jsonb,
  erro_texto text,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz
);

create table if not exists public.logs_sistema (
  id uuid primary key default gen_random_uuid(),
  gravidade text not null default 'info',
  modulo text not null default 'sistema',
  id_salao uuid references public.saloes(id) on delete set null,
  id_usuario uuid references public.usuarios(id) on delete set null,
  mensagem text not null,
  detalhes_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists public.reprocessamentos_sistema (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  entidade text not null,
  entidade_id text,
  id_admin_usuario uuid references public.admin_master_usuarios(id) on delete set null,
  status text not null default 'pendente',
  resultado_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists public.checklist_itens (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  ordem integer not null default 0
);

create table if not exists public.checklists_salao (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_checklist_item uuid not null references public.checklist_itens(id) on delete cascade,
  concluido boolean not null default false,
  concluido_em timestamptz,
  origem text not null default 'automatico',
  unique (id_salao, id_checklist_item)
);

create table if not exists public.score_onboarding_salao (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null unique references public.saloes(id) on delete cascade,
  score_total integer not null default 0,
  dias_com_acesso integer not null default 0,
  modulos_usados integer not null default 0,
  detalhes_json jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.score_saude_salao (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null unique references public.saloes(id) on delete cascade,
  score_total integer not null default 0,
  uso_recente integer not null default 0,
  inadimplencia_risco integer not null default 0,
  tickets_abertos integer not null default 0,
  risco_cancelamento integer not null default 0,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.trial_extensoes_regras (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  score_minimo integer not null default 70,
  dias_extra integer not null default 7,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.trial_extensoes_automaticas (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null unique references public.saloes(id) on delete cascade,
  trial_original_fim timestamptz,
  trial_novo_fim timestamptz not null,
  score_atingido integer not null default 0,
  motivo text,
  aplicado_automaticamente boolean not null default true,
  criado_em timestamptz not null default now()
);

insert into public.checklist_itens (codigo, nome, descricao, ordem)
values
  ('cadastro_salao', 'Cadastro do salao completo', 'Dados principais do salao preenchidos.', 10),
  ('profissionais', 'Profissionais cadastrados', 'Pelo menos dois profissionais ativos.', 20),
  ('servicos', 'Servicos cadastrados', 'Pelo menos cinco servicos ativos.', 30),
  ('clientes', 'Clientes cadastrados', 'Pelo menos cinco clientes.', 40),
  ('agendamentos', 'Agendamentos criados', 'Pelo menos tres agendamentos.', 50),
  ('comandas', 'Comanda criada', 'Pelo menos uma comanda.', 60),
  ('vendas', 'Primeira venda', 'Pelo menos uma venda fechada.', 70),
  ('caixa', 'Caixa aberto', 'Pelo menos uma sessao de caixa.', 80),
  ('dias_acesso', 'Uso em dias diferentes', 'Uso em pelo menos tres dias.', 90),
  ('modulos', 'Modulos principais usados', 'Uso em pelo menos quatro modulos.', 100)
on conflict (codigo) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ordem = excluded.ordem,
  ativo = true;

insert into public.trial_extensoes_regras (nome, score_minimo, dias_extra, ativo)
values ('Regra padrao +7 dias por bom uso', 70, 7, true)
on conflict (nome) do update set
  score_minimo = excluded.score_minimo,
  dias_extra = excluded.dias_extra,
  ativo = true;

with planos(codigo, nome, subtitulo, descricao, valor_mensal, preco_anual, limite_usuarios, limite_profissionais, destaque, ordem, trial_dias, ideal_para, cta, metadata) as (
  values
    ('teste_gratis', 'Teste gratis', 'Teste gratuito para sentir valor rapido', '7 dias gratis com operacao essencial liberada.', 0.00, 0.00, 1, 3, false, 1, 7, 'Saloes que estao comecando o teste.', 'Comecar teste gratis', '{"tom":"entrada","badge":"Trial"}'::jsonb),
    ('basico', 'Basico', 'Essencial para organizar o salao', 'Agenda, clientes, servicos, caixa, comandas, vendas e comissao basica.', 49.90, 499.00, 2, 3, false, 2, 0, 'Salao pequeno com rotina simples.', 'Assinar Basico', '{"tom":"essencial","badge":"Entrada"}'::jsonb),
    ('pro', 'Pro', 'Mais controle para equipe em crescimento', 'Tudo do Basico com estoque, app profissional, comissoes avancadas e relatorios melhores.', 89.90, 899.00, 5, 10, true, 3, 0, 'Salao estruturado que precisa controlar operacao.', 'Assinar Pro', '{"tom":"crescimento","badge":"Mais escolhido"}'::jsonb),
    ('premium', 'Premium', 'Tudo liberado para operacao premium', 'Recursos completos, WhatsApp, campanhas, suporte prioritario, relatorios premium e limites altos.', 149.90, 1499.00, 999, 999, false, 4, 0, 'Salao que quer automatizar e vender mais.', 'Assinar Premium', '{"tom":"premium","badge":"Completo"}'::jsonb)
)
insert into public.planos_saas (
  codigo, nome, subtitulo, descricao, valor_mensal, preco_anual,
  limite_usuarios, limite_profissionais, destaque, ordem, trial_dias,
  ideal_para, cta, metadata, ativo
)
select
  codigo, nome, subtitulo, descricao, valor_mensal, preco_anual,
  limite_usuarios, limite_profissionais, destaque, ordem, trial_dias,
  ideal_para, cta, metadata, true
from planos
where not exists (select 1 from public.planos_saas p where p.codigo = planos.codigo)
on conflict do nothing;

with planos(codigo, nome, subtitulo, descricao, valor_mensal, preco_anual, limite_usuarios, limite_profissionais, destaque, ordem, trial_dias, ideal_para, cta, metadata) as (
  values
    ('teste_gratis', 'Teste gratis', 'Teste gratuito para sentir valor rapido', '7 dias gratis com operacao essencial liberada.', 0.00, 0.00, 1, 3, false, 1, 7, 'Saloes que estao comecando o teste.', 'Comecar teste gratis', '{"tom":"entrada","badge":"Trial"}'::jsonb),
    ('basico', 'Basico', 'Essencial para organizar o salao', 'Agenda, clientes, servicos, caixa, comandas, vendas e comissao basica.', 49.90, 499.00, 2, 3, false, 2, 0, 'Salao pequeno com rotina simples.', 'Assinar Basico', '{"tom":"essencial","badge":"Entrada"}'::jsonb),
    ('pro', 'Pro', 'Mais controle para equipe em crescimento', 'Tudo do Basico com estoque, app profissional, comissoes avancadas e relatorios melhores.', 89.90, 899.00, 5, 10, true, 3, 0, 'Salao estruturado que precisa controlar operacao.', 'Assinar Pro', '{"tom":"crescimento","badge":"Mais escolhido"}'::jsonb),
    ('premium', 'Premium', 'Tudo liberado para operacao premium', 'Recursos completos, WhatsApp, campanhas, suporte prioritario, relatorios premium e limites altos.', 149.90, 1499.00, 999, 999, false, 4, 0, 'Salao que quer automatizar e vender mais.', 'Assinar Premium', '{"tom":"premium","badge":"Completo"}'::jsonb)
)
update public.planos_saas p
set
  nome = planos.nome,
  subtitulo = planos.subtitulo,
  descricao = planos.descricao,
  valor_mensal = planos.valor_mensal,
  preco_anual = planos.preco_anual,
  limite_usuarios = planos.limite_usuarios,
  limite_profissionais = planos.limite_profissionais,
  destaque = planos.destaque,
  ordem = planos.ordem,
  trial_dias = planos.trial_dias,
  ideal_para = planos.ideal_para,
  cta = planos.cta,
  metadata = planos.metadata,
  ativo = true,
  updated_at = now()
from planos
where p.codigo = planos.codigo;

with matriz(codigo, recurso, habilitado, limite_numero, observacao) as (
  values
    ('teste_gratis', 'agenda', true, null, 'Agenda liberada no trial'),
    ('teste_gratis', 'clientes', true, null, 'Clientes liberados no trial'),
    ('teste_gratis', 'profissionais', true, 3, 'Ate 3 profissionais'),
    ('teste_gratis', 'usuarios', true, 1, 'Ate 1 usuario'),
    ('teste_gratis', 'servicos', true, null, 'Servicos liberados no trial'),
    ('teste_gratis', 'servicos_extras', true, null, 'Extras liberados no trial'),
    ('teste_gratis', 'produtos', true, null, 'Produtos basicos'),
    ('teste_gratis', 'caixa', true, null, 'Caixa liberado'),
    ('teste_gratis', 'comandas', true, null, 'Comandas liberadas'),
    ('teste_gratis', 'vendas', true, null, 'Vendas basicas'),
    ('teste_gratis', 'comissoes_basicas', true, null, 'Comissao basica'),
    ('teste_gratis', 'relatorios_basicos', true, null, 'Relatorios simples'),
    ('teste_gratis', 'estoque', false, null, 'Disponivel no Pro'),
    ('teste_gratis', 'comissoes_avancadas', false, null, 'Disponivel no Pro'),
    ('teste_gratis', 'relatorios_avancados', false, null, 'Disponivel no Pro'),
    ('teste_gratis', 'dashboard_avancado', false, null, 'Disponivel no Pro'),
    ('teste_gratis', 'app_profissional', false, null, 'Disponivel no Pro'),
    ('teste_gratis', 'whatsapp', false, 0, 'Pacote opcional'),
    ('teste_gratis', 'campanhas', false, null, 'Disponivel no Premium'),
    ('teste_gratis', 'marketing', false, null, 'Disponivel no Premium'),
    ('basico', 'agenda', true, null, 'Agenda completa'),
    ('basico', 'clientes', true, null, 'Clientes liberados'),
    ('basico', 'profissionais', true, 3, 'Ate 3 profissionais'),
    ('basico', 'usuarios', true, 2, 'Ate 2 usuarios'),
    ('basico', 'servicos', true, null, 'Servicos liberados'),
    ('basico', 'servicos_extras', true, null, 'Extras liberados'),
    ('basico', 'produtos', true, null, 'Produtos liberados'),
    ('basico', 'caixa', true, null, 'Caixa liberado'),
    ('basico', 'comandas', true, null, 'Comandas liberadas'),
    ('basico', 'vendas', true, null, 'Vendas liberadas'),
    ('basico', 'comissoes_basicas', true, null, 'Comissao basica'),
    ('basico', 'relatorios_basicos', true, null, 'Relatorios basicos'),
    ('basico', 'estoque', false, null, 'Disponivel no Pro'),
    ('basico', 'comissoes_avancadas', false, null, 'Disponivel no Pro'),
    ('basico', 'relatorios_avancados', false, null, 'Disponivel no Pro'),
    ('basico', 'dashboard_avancado', false, null, 'Disponivel no Pro'),
    ('basico', 'app_profissional', false, null, 'Disponivel no Pro'),
    ('basico', 'whatsapp', false, 0, 'Pacote opcional'),
    ('basico', 'campanhas', false, null, 'Disponivel no Premium'),
    ('basico', 'marketing', false, null, 'Disponivel no Premium'),
    ('pro', 'agenda', true, null, 'Liberado'),
    ('pro', 'clientes', true, null, 'Liberado'),
    ('pro', 'profissionais', true, 10, 'Ate 10 profissionais'),
    ('pro', 'usuarios', true, 5, 'Ate 5 usuarios'),
    ('pro', 'servicos', true, null, 'Liberado'),
    ('pro', 'servicos_extras', true, null, 'Liberado'),
    ('pro', 'produtos', true, null, 'Liberado'),
    ('pro', 'estoque', true, null, 'Liberado'),
    ('pro', 'caixa', true, null, 'Liberado'),
    ('pro', 'comandas', true, null, 'Liberado'),
    ('pro', 'vendas', true, null, 'Liberado'),
    ('pro', 'comissoes_basicas', true, null, 'Liberado'),
    ('pro', 'comissoes_avancadas', true, null, 'Liberado'),
    ('pro', 'relatorios_basicos', true, null, 'Liberado'),
    ('pro', 'relatorios_avancados', true, null, 'Liberado'),
    ('pro', 'dashboard_avancado', true, null, 'Liberado'),
    ('pro', 'app_profissional', true, null, 'Liberado'),
    ('pro', 'whatsapp', false, 0, 'Pacote opcional'),
    ('pro', 'campanhas', false, null, 'Disponivel no Premium'),
    ('pro', 'marketing', true, null, 'Marketing basico'),
    ('premium', 'agenda', true, null, 'Liberado'),
    ('premium', 'clientes', true, null, 'Liberado'),
    ('premium', 'profissionais', true, 999, 'Ilimitado operacional'),
    ('premium', 'usuarios', true, 999, 'Ilimitado operacional'),
    ('premium', 'servicos', true, null, 'Liberado'),
    ('premium', 'servicos_extras', true, null, 'Liberado'),
    ('premium', 'produtos', true, null, 'Liberado'),
    ('premium', 'estoque', true, null, 'Liberado'),
    ('premium', 'caixa', true, null, 'Liberado'),
    ('premium', 'comandas', true, null, 'Liberado'),
    ('premium', 'vendas', true, null, 'Liberado'),
    ('premium', 'comissoes_basicas', true, null, 'Liberado'),
    ('premium', 'comissoes_avancadas', true, null, 'Liberado'),
    ('premium', 'relatorios_basicos', true, null, 'Liberado'),
    ('premium', 'relatorios_avancados', true, null, 'Liberado'),
    ('premium', 'dashboard_avancado', true, null, 'Liberado'),
    ('premium', 'app_profissional', true, null, 'Liberado'),
    ('premium', 'whatsapp', true, null, 'Liberado com pacotes'),
    ('premium', 'campanhas', true, null, 'Liberado'),
    ('premium', 'marketing', true, null, 'Liberado'),
    ('premium', 'recursos_beta', true, null, 'Liberado'),
    ('premium', 'suporte_prioritario', true, null, 'Liberado')
)
insert into public.planos_recursos (id_plano, recurso_codigo, habilitado, limite_numero, observacao)
select p.id, m.recurso, m.habilitado, m.limite_numero, m.observacao
from matriz m
join public.planos_saas p on p.codigo = m.codigo
on conflict (id_plano, recurso_codigo) do update set
  habilitado = excluded.habilitado,
  limite_numero = excluded.limite_numero,
  observacao = excluded.observacao,
  atualizado_em = now();

insert into public.whatsapp_pacotes (nome, quantidade_creditos, preco, ativo)
values
  ('Pacote 500 mensagens', 500, 39.90, true),
  ('Pacote 1500 mensagens', 1500, 89.90, true),
  ('Pacote 5000 mensagens', 5000, 249.90, true)
on conflict (nome) do update set
  quantidade_creditos = excluded.quantidade_creditos,
  preco = excluded.preco,
  ativo = true;

insert into public.admin_master_tags_salao (nome, cor, ativo)
values
  ('VIP', '#111827', true),
  ('Risco cancelamento', '#dc2626', true),
  ('Suporte intenso', '#f97316', true),
  ('Potencial upgrade', '#2563eb', true),
  ('Inadimplente recorrente', '#7f1d1d', true)
on conflict (nome) do update set
  cor = excluded.cor,
  ativo = true;

insert into public.admin_master_usuarios (auth_user_id, nome, email, perfil, status)
select
  u.auth_user_id,
  coalesce(nullif(u.nome, ''), split_part(u.email, '@', 1), 'Admin Master'),
  lower(u.email),
  'owner',
  'ativo'
from public.usuarios u
where u.auth_user_id is not null
  and u.email is not null
  and lower(coalesce(u.nivel, '')) = 'admin'
  and not exists (select 1 from public.admin_master_usuarios)
order by u.created_at asc nulls last
limit 1
on conflict (email) do nothing;

insert into public.admin_master_permissoes (
  id_admin_master_usuario,
  dashboard_ver,
  saloes_ver,
  saloes_editar,
  saloes_entrar_como,
  assinaturas_ver,
  assinaturas_ajustar,
  cobrancas_ver,
  cobrancas_reprocessar,
  financeiro_ver,
  operacao_ver,
  operacao_reprocessar,
  suporte_ver,
  tickets_ver,
  tickets_editar,
  produto_ver,
  planos_editar,
  recursos_editar,
  feature_flags_editar,
  comunicacao_ver,
  notificacoes_editar,
  campanhas_editar,
  whatsapp_ver,
  whatsapp_editar,
  relatorios_ver,
  usuarios_admin_ver,
  usuarios_admin_editar,
  auditoria_ver
)
select
  amu.id,
  true, true, true, true, true, true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true, true, true, true, true
from public.admin_master_usuarios amu
where amu.perfil = 'owner'
on conflict (id_admin_master_usuario) do update set
  dashboard_ver = true,
  saloes_ver = true,
  saloes_editar = true,
  saloes_entrar_como = true,
  assinaturas_ver = true,
  assinaturas_ajustar = true,
  cobrancas_ver = true,
  cobrancas_reprocessar = true,
  financeiro_ver = true,
  operacao_ver = true,
  operacao_reprocessar = true,
  suporte_ver = true,
  tickets_ver = true,
  tickets_editar = true,
  produto_ver = true,
  planos_editar = true,
  recursos_editar = true,
  feature_flags_editar = true,
  comunicacao_ver = true,
  notificacoes_editar = true,
  campanhas_editar = true,
  whatsapp_ver = true,
  whatsapp_editar = true,
  relatorios_ver = true,
  usuarios_admin_ver = true,
  usuarios_admin_editar = true,
  auditoria_ver = true,
  atualizado_em = now();

create or replace function public.fn_admin_master_registrar_auditoria(
  p_id_admin_usuario uuid,
  p_acao text,
  p_entidade text,
  p_entidade_id text default null,
  p_descricao text default null,
  p_payload_json jsonb default '{}'::jsonb,
  p_ip text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.admin_master_auditoria (
    id_admin_usuario,
    acao,
    entidade,
    entidade_id,
    descricao,
    payload_json,
    ip,
    user_agent
  )
  values (
    p_id_admin_usuario,
    p_acao,
    p_entidade,
    p_entidade_id,
    p_descricao,
    coalesce(p_payload_json, '{}'::jsonb),
    p_ip,
    p_user_agent
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.fn_admin_master_calcular_score_onboarding(p_id_salao uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score integer := 0;
  v_dias_acesso integer := 0;
  v_modulos_usados integer := 0;
  v_cadastro boolean := false;
  v_profissionais integer := 0;
  v_servicos integer := 0;
  v_clientes integer := 0;
  v_agendamentos integer := 0;
  v_comandas integer := 0;
  v_vendas integer := 0;
  v_caixas integer := 0;
  v_detalhes jsonb;
begin
  select (
    coalesce(nome, '') <> ''
    and coalesce(responsavel, '') <> ''
    and coalesce(telefone, whatsapp, '') <> ''
  )
  into v_cadastro
  from public.saloes
  where id = p_id_salao;

  select count(*) into v_profissionais from public.profissionais
  where id_salao = p_id_salao and coalesce(ativo, true) = true;

  select count(*) into v_servicos from public.servicos
  where id_salao = p_id_salao and coalesce(ativo, true) = true;

  select count(*) into v_clientes from public.clientes
  where id_salao = p_id_salao and deleted_at is null;

  select count(*) into v_agendamentos from public.agendamentos
  where id_salao = p_id_salao;

  select count(*) into v_comandas from public.comandas
  where id_salao = p_id_salao;

  select count(*) into v_vendas from public.comandas
  where id_salao = p_id_salao and lower(coalesce(status, '')) = 'fechada';

  select count(*) into v_caixas from public.caixa_sessoes
  where id_salao = p_id_salao;

  v_modulos_usados :=
    (case when v_agendamentos > 0 then 1 else 0 end) +
    (case when v_comandas > 0 then 1 else 0 end) +
    (case when v_vendas > 0 then 1 else 0 end) +
    (case when v_caixas > 0 then 1 else 0 end) +
    (case when v_clientes > 0 then 1 else 0 end) +
    (case when v_profissionais > 0 then 1 else 0 end);

  v_dias_acesso := least(3, greatest(0, v_modulos_usados - 1));

  v_score :=
    (case when v_cadastro then 10 else 0 end) +
    (case when v_profissionais >= 2 then 10 else 0 end) +
    (case when v_servicos >= 5 then 10 else 0 end) +
    (case when v_clientes >= 5 then 10 else 0 end) +
    (case when v_agendamentos >= 3 then 10 else 0 end) +
    (case when v_comandas >= 1 then 10 else 0 end) +
    (case when v_vendas >= 1 then 10 else 0 end) +
    (case when v_caixas >= 1 then 10 else 0 end) +
    (case when v_dias_acesso >= 3 then 10 else 0 end) +
    (case when v_modulos_usados >= 4 then 10 else 0 end);

  v_detalhes := jsonb_build_object(
    'cadastro_completo', v_cadastro,
    'profissionais', v_profissionais,
    'servicos', v_servicos,
    'clientes', v_clientes,
    'agendamentos', v_agendamentos,
    'comandas', v_comandas,
    'vendas', v_vendas,
    'caixas', v_caixas,
    'dias_com_acesso', v_dias_acesso,
    'modulos_usados', v_modulos_usados
  );

  insert into public.score_onboarding_salao (
    id_salao,
    score_total,
    dias_com_acesso,
    modulos_usados,
    detalhes_json,
    atualizado_em
  )
  values (p_id_salao, v_score, v_dias_acesso, v_modulos_usados, v_detalhes, now())
  on conflict (id_salao) do update set
    score_total = excluded.score_total,
    dias_com_acesso = excluded.dias_com_acesso,
    modulos_usados = excluded.modulos_usados,
    detalhes_json = excluded.detalhes_json,
    atualizado_em = now();

  return v_score;
end;
$$;

create or replace function public.fn_admin_master_avaliar_extensao_trial(p_id_salao uuid default null)
returns table (
  id_salao uuid,
  score integer,
  aplicado boolean,
  mensagem text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_score integer;
  v_regra record;
  v_trial_original timestamptz;
  v_trial_novo timestamptz;
begin
  select *
    into v_regra
  from public.trial_extensoes_regras
  where ativo = true
  order by score_minimo asc
  limit 1;

  if not found then
    return;
  end if;

  for r in
    select
      s.id,
      s.trial_fim_em,
      a.id as id_assinatura,
      a.trial_fim_em as assinatura_trial_fim,
      a.vencimento_em,
      lower(coalesce(a.status, s.status, '')) as status_atual
    from public.saloes s
    left join public.assinaturas a on a.id_salao = s.id
    where (p_id_salao is null or s.id = p_id_salao)
      and lower(coalesce(a.status, s.status, '')) in ('teste_gratis', 'trial')
      and not exists (
        select 1
        from public.trial_extensoes_automaticas tea
        where tea.id_salao = s.id
      )
  loop
    v_score := public.fn_admin_master_calcular_score_onboarding(r.id);
    v_trial_original := coalesce(
      nullif(r.assinatura_trial_fim, '')::timestamptz,
      r.trial_fim_em,
      r.vencimento_em::timestamptz
    );

    if v_trial_original is null then
      id_salao := r.id;
      score := v_score;
      aplicado := false;
      mensagem := 'Trial sem data final para avaliacao.';
      return next;
      continue;
    end if;

    if v_trial_original::date < (current_date + interval '1 day')::date
       or v_trial_original::date > (current_date + interval '2 days')::date then
      id_salao := r.id;
      score := v_score;
      aplicado := false;
      mensagem := 'Salao fora da janela de avaliacao do dia 6 ou 7.';
      return next;
      continue;
    end if;

    if v_score < v_regra.score_minimo then
      id_salao := r.id;
      score := v_score;
      aplicado := false;
      mensagem := 'Score insuficiente para extensao automatica.';
      return next;
      continue;
    end if;

    v_trial_novo := v_trial_original + make_interval(days => v_regra.dias_extra);

    insert into public.trial_extensoes_automaticas (
      id_salao,
      trial_original_fim,
      trial_novo_fim,
      score_atingido,
      motivo,
      aplicado_automaticamente
    )
    values (
      r.id,
      v_trial_original,
      v_trial_novo,
      v_score,
      'Extensao automatica por bom uso do sistema.',
      true
    );

    update public.saloes
    set
      trial_fim_em = v_trial_novo,
      updated_at = now()::text
    where id = r.id;

    update public.assinaturas
    set
      trial_fim_em = v_trial_novo::text,
      vencimento_em = v_trial_novo::date,
      updated_at = now()
    where id_salao = r.id
      and lower(coalesce(status, '')) in ('teste_gratis', 'trial');

    insert into public.notificacoes_globais (
      titulo,
      descricao,
      tipo,
      publico_tipo,
      filtros_json,
      status,
      enviada_em
    )
    values (
      'Voce ganhou mais 7 dias gratis',
      'Vimos que voce esta aproveitando bem o SalaoPremium. Liberamos mais 7 dias gratis para explorar ainda mais o sistema.',
      'conquista',
      'salao_especifico',
      jsonb_build_object('id_salao', r.id),
      'enviada',
      now()
    );

    id_salao := r.id;
    score := v_score;
    aplicado := true;
    mensagem := 'Trial estendido automaticamente.';
    return next;
  end loop;
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'planos_recursos',
    'saloes_recursos_extras',
    'saloes_bloqueios',
    'admin_master_usuarios',
    'admin_master_permissoes',
    'admin_master_auditoria',
    'admin_master_anotacoes_salao',
    'admin_master_tags_salao',
    'admin_master_salao_tags',
    'tickets',
    'ticket_mensagens',
    'ticket_eventos',
    'notificacoes_globais',
    'notificacoes_destinos',
    'campanhas',
    'campanha_destinos',
    'alertas_sistema',
    'whatsapp_pacotes',
    'whatsapp_pacote_saloes',
    'whatsapp_templates',
    'whatsapp_envios',
    'whatsapp_filas',
    'feature_flags',
    'feature_flag_saloes',
    'configuracoes_globais',
    'configuracoes_globais_historico',
    'eventos_webhook',
    'eventos_cron',
    'logs_sistema',
    'reprocessamentos_sistema',
    'checklist_itens',
    'checklists_salao',
    'score_onboarding_salao',
    'score_saude_salao',
    'trial_extensoes_regras',
    'trial_extensoes_automaticas'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on table public.%I from anon, authenticated', tbl);
  end loop;
end
$$;

revoke all on function public.fn_admin_master_registrar_auditoria(uuid, text, text, text, text, jsonb, text, text)
  from public, anon, authenticated;
revoke all on function public.fn_admin_master_calcular_score_onboarding(uuid)
  from public, anon, authenticated;
revoke all on function public.fn_admin_master_avaliar_extensao_trial(uuid)
  from public, anon, authenticated;

grant execute on function public.fn_admin_master_registrar_auditoria(uuid, text, text, text, text, jsonb, text, text)
  to service_role;
grant execute on function public.fn_admin_master_calcular_score_onboarding(uuid)
  to service_role;
grant execute on function public.fn_admin_master_avaliar_extensao_trial(uuid)
  to service_role;
