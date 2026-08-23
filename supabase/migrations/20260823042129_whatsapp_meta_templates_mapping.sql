alter table public.whatsapp_templates
  add column if not exists nome_meta text,
  add column if not exists idioma text not null default 'pt_BR',
  add column if not exists cabecalho text,
  add column if not exists categoria_meta text,
  add column if not exists tipo_interno text,
  add column if not exists variaveis_json jsonb not null default '[]'::jsonb,
  add column if not exists atualizado_em timestamptz not null default timezone('utc', now());

create index if not exists whatsapp_templates_nome_meta_idx
  on public.whatsapp_templates (lower(nome_meta))
  where nome_meta is not null;

create index if not exists whatsapp_templates_tipo_interno_idx
  on public.whatsapp_templates (tipo_interno, ativo)
  where tipo_interno is not null;

with payload (
  nome_meta,
  nome,
  categoria,
  categoria_meta,
  tipo_interno,
  cabecalho,
  conteudo,
  variaveis_json
) as (
  values
    (
      'agendamento_alterado',
      'Agendamento atualizado',
      'utility',
      'utility',
      'agendamento_alteracao',
      'Agendamento atualizado',
      'Olá, {{1}}! 🔄 Seu agendamento foi atualizado.

📅 Nova data: {{2}}
⏰ Novo horário: {{3}}
👤 Profissional: {{4}}
✂️ Serviço: {{5}}

Confira os novos dados do seu atendimento.',
      '[
        {"position":1,"key":"cliente","label":"Cliente"},
        {"position":2,"key":"data","label":"Data"},
        {"position":3,"key":"horario","label":"Horário"},
        {"position":4,"key":"profissional","label":"Profissional"},
        {"position":5,"key":"servico","label":"Serviço"}
      ]'::jsonb
    ),
    (
      'lembrete_agendamento',
      'Lembrete de agendamento',
      'utility',
      'utility',
      'lembrete_agendamento',
      'Lembrete de agendamento',
      'Olá, {{1}}! ⏰ Passando para lembrar que você tem um agendamento marcado para {{2}}, às {{3}}, com {{4}}.

✂️ Serviço: {{5}}.

Esperamos você! 😊',
      '[
        {"position":1,"key":"cliente","label":"Cliente"},
        {"position":2,"key":"data","label":"Data"},
        {"position":3,"key":"horario","label":"Horário"},
        {"position":4,"key":"profissional","label":"Profissional"},
        {"position":5,"key":"servico","label":"Serviço"}
      ]'::jsonb
    ),
    (
      'agendamento_cancelado',
      'Agendamento cancelado',
      'utility',
      'utility',
      'agendamento_cancelamento',
      'Agendamento cancelado',
      'Olá, {{1}}. Seu agendamento do dia {{2}}, às {{3}}, foi cancelado. ❌

✂️ Serviço: {{4}}
👤 Profissional: {{5}}

Se desejar, você poderá realizar um novo agendamento.',
      '[
        {"position":1,"key":"cliente","label":"Cliente"},
        {"position":2,"key":"data","label":"Data marcada"},
        {"position":3,"key":"horario","label":"Horário marcado"},
        {"position":4,"key":"servico","label":"Serviço"},
        {"position":5,"key":"profissional","label":"Profissional"}
      ]'::jsonb
    ),
    (
      'profissional_confirmado',
      'Profissional confirmado',
      'utility',
      'utility',
      'agendamento_confirmacao',
      'Profissional confirmado',
      'Olá, {{1}}! 👋 O profissional do seu próximo atendimento está confirmado.

👤 Profissional: {{2}}
📅 Data: {{3}}
⏰ Horário: {{4}}
✂️ Serviço: {{5}}

Até o seu atendimento! 😊',
      '[
        {"position":1,"key":"cliente","label":"Cliente"},
        {"position":2,"key":"profissional","label":"Profissional"},
        {"position":3,"key":"data","label":"Data"},
        {"position":4,"key":"horario","label":"Horário"},
        {"position":5,"key":"servico","label":"Serviço"}
      ]'::jsonb
    ),
    (
      'pagamento_confirmado',
      'Pagamento confirmado',
      'utility',
      'utility',
      'pagamento_confirmacao',
      'Pagamento confirmado',
      'Olá, {{1}}! ✅ Recebemos a confirmação do seu pagamento.

💰 Valor: R$ {{2}}
🧾 Referência: {{3}}
📅 Data: {{4}}

Seu pagamento foi registrado com sucesso.',
      '[
        {"position":1,"key":"cliente","label":"Cliente"},
        {"position":2,"key":"valor","label":"Valor pago"},
        {"position":3,"key":"referencia","label":"Referência"},
        {"position":4,"key":"data","label":"Data do pagamento"}
      ]'::jsonb
    ),
    (
      'aviso_atualizacao_acesso',
      'Atualização importante',
      'utility',
      'utility',
      'atendimento_cliente',
      'Atualização importante',
      'Olá, {{1}}! 👋

Fizemos uma atualização na forma de acesso ao SalãoPremium.

Para continuar utilizando sua conta normalmente, abra o aplicativo e confira as novas instruções disponíveis na tela de acesso.

Se precisar de ajuda, fale com nosso suporte pelo WhatsApp.',
      '[
        {"position":1,"key":"cliente","label":"Cliente"}
      ]'::jsonb
    ),
    (
      'codigo_verificacao',
      'Código de verificação',
      'authentication',
      'authentication',
      'codigo_verificacao',
      'Código de verificação',
      'Seu código de verificação é {{1}}.',
      '[
        {"position":1,"key":"codigo","label":"Código"}
      ]'::jsonb
    )
),
updated as (
  update public.whatsapp_templates target
  set
    nome = payload.nome,
    categoria = payload.categoria,
    conteudo = payload.conteudo,
    ativo = true,
    nome_meta = payload.nome_meta,
    idioma = 'pt_BR',
    cabecalho = payload.cabecalho,
    categoria_meta = payload.categoria_meta,
    tipo_interno = payload.tipo_interno,
    variaveis_json = payload.variaveis_json,
    atualizado_em = timezone('utc', now())
  from payload
  where lower(target.nome) = lower(payload.nome_meta)
     or lower(coalesce(target.nome_meta, '')) = lower(payload.nome_meta)
     or lower(coalesce(target.tipo_interno, '')) = lower(payload.tipo_interno)
  returning payload.nome_meta
)
insert into public.whatsapp_templates (
  nome,
  categoria,
  conteudo,
  ativo,
  nome_meta,
  idioma,
  cabecalho,
  categoria_meta,
  tipo_interno,
  variaveis_json,
  atualizado_em
)
select
  payload.nome,
  payload.categoria,
  payload.conteudo,
  true,
  payload.nome_meta,
  'pt_BR',
  payload.cabecalho,
  payload.categoria_meta,
  payload.tipo_interno,
  payload.variaveis_json,
  timezone('utc', now())
from payload
where not exists (
  select 1
  from updated
  where updated.nome_meta = payload.nome_meta
);
