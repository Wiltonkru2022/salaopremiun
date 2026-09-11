update public.planos_saas
set
  nome = case codigo
    when 'teste_gratis' then 'Teste grátis'
    when 'basico' then 'Básico'
    when 'pro' then 'Pro'
    when 'premium' then 'Premium'
    else nome
  end,
  subtitulo = case codigo
    when 'teste_gratis' then 'Prove a operação antes de pagar'
    when 'basico' then 'O essencial para um salão pequeno operar bem'
    when 'pro' then 'Estrutura para equipe em crescimento'
    when 'premium' then 'Tudo liberado para operação sem teto prático'
    else subtitulo
  end,
  descricao = case codigo
    when 'teste_gratis' then 'Agenda, caixa e venda liberados para provar a operação real do salão.'
    when 'basico' then 'Agenda, clientes, serviços, caixa, comandas, vendas e leitura básica do negócio.'
    when 'pro' then 'Tudo do Básico com estoque, app profissional, comissões avançadas e leitura gerencial mais forte.'
    when 'premium' then 'Plano completo com todos os recursos liberados, comunicação e suporte prioritário.'
    else descricao
  end,
  ideal_para = case codigo
    when 'teste_gratis' then 'Quem quer validar o sistema antes de assinar.'
    when 'basico' then 'Salão pequeno com 1 a 3 profissionais.'
    when 'pro' then 'Equipe em crescimento que precisa de mais controle.'
    when 'premium' then 'Operação madura que quer tudo liberado.'
    else ideal_para
  end,
  cta = case codigo
    when 'teste_gratis' then 'Começar teste grátis'
    when 'basico' then 'Assinar Básico'
    when 'pro' then 'Assinar Pro'
    when 'premium' then 'Assinar Premium'
    else cta
  end,
  limite_usuarios = case codigo
    when 'teste_gratis' then 1
    when 'basico' then 2
    when 'pro' then 5
    when 'premium' then 999
    else limite_usuarios
  end,
  limite_profissionais = case codigo
    when 'teste_gratis' then 3
    when 'basico' then 3
    when 'pro' then 10
    when 'premium' then 999
    else limite_profissionais
  end
where codigo in ('teste_gratis', 'basico', 'pro', 'premium');

insert into public.planos_recursos (id_plano, recurso_codigo, habilitado, limite_numero, observacao)
select p.id, 'agendamentos_mensais', true,
  case p.codigo
    when 'teste_gratis' then 40
    when 'basico' then 250
    when 'pro' then 900
    when 'premium' then 999
  end,
  case p.codigo
    when 'teste_gratis' then 'Limite mensal do período de teste'
    when 'basico' then 'Limite mensal do plano Básico'
    when 'pro' then 'Limite mensal do plano Pro'
    when 'premium' then 'Sem limite prático'
  end
from public.planos_saas p
where p.codigo in ('teste_gratis', 'basico', 'pro', 'premium')
on conflict (id_plano, recurso_codigo) do update
set
  habilitado = excluded.habilitado,
  limite_numero = excluded.limite_numero,
  observacao = excluded.observacao,
  atualizado_em = now();

update public.planos_recursos pr
set
  limite_numero = case p.codigo
    when 'teste_gratis' then 100
    when 'basico' then 2000
    when 'pro' then 10000
    when 'premium' then 999
    else pr.limite_numero
  end,
  observacao = case p.codigo
    when 'teste_gratis' then 'Até 100 clientes'
    when 'basico' then 'Até 2.000 clientes'
    when 'pro' then 'Até 10.000 clientes'
    when 'premium' then 'Sem limite prático'
    else pr.observacao
  end,
  atualizado_em = now()
from public.planos_saas p
where pr.id_plano = p.id
  and pr.recurso_codigo = 'clientes'
  and p.codigo in ('teste_gratis', 'basico', 'pro', 'premium');

update public.planos_recursos pr
set
  limite_numero = case p.codigo
    when 'teste_gratis' then 20
    when 'basico' then 80
    when 'pro' then 250
    when 'premium' then 999
    else pr.limite_numero
  end,
  observacao = case p.codigo
    when 'teste_gratis' then 'Até 20 serviços'
    when 'basico' then 'Até 80 serviços'
    when 'pro' then 'Até 250 serviços'
    when 'premium' then 'Sem limite prático'
    else pr.observacao
  end,
  atualizado_em = now()
from public.planos_saas p
where pr.id_plano = p.id
  and pr.recurso_codigo = 'servicos'
  and p.codigo in ('teste_gratis', 'basico', 'pro', 'premium');

update public.planos_recursos pr
set
  observacao = case p.codigo
    when 'teste_gratis' then 'Ate 3 profissionais'
    when 'basico' then 'Ate 3 profissionais'
    when 'pro' then 'Ate 10 profissionais'
    when 'premium' then 'Sem limite prático'
    else pr.observacao
  end,
  atualizado_em = now()
from public.planos_saas p
where pr.id_plano = p.id
  and pr.recurso_codigo = 'profissionais'
  and p.codigo in ('teste_gratis', 'basico', 'pro', 'premium');

update public.planos_recursos pr
set
  observacao = case p.codigo
    when 'teste_gratis' then 'Ate 1 usuario'
    when 'basico' then 'Ate 2 usuarios'
    when 'pro' then 'Ate 5 usuarios'
    when 'premium' then 'Sem limite prático'
    else pr.observacao
  end,
  atualizado_em = now()
from public.planos_saas p
where pr.id_plano = p.id
  and pr.recurso_codigo = 'usuarios'
  and p.codigo in ('teste_gratis', 'basico', 'pro', 'premium');
