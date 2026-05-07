do $$
begin
  if to_regclass('public.planos_saas') is null then
    raise exception 'Tabela public.planos_saas nao encontrada.';
  end if;

  if to_regclass('public.planos_recursos') is null then
    raise exception 'Tabela public.planos_recursos nao encontrada.';
  end if;
end
$$;

with planos(codigo, nome, subtitulo, descricao, valor_mensal, preco_anual, limite_usuarios, limite_profissionais, destaque, ordem, trial_dias, ideal_para, cta, metadata) as (
  values
    ('teste_gratis', 'Teste gratis', 'Teste gratuito para sentir valor rapido', '7 dias gratis com operacao essencial liberada.', 0.00, 0.00, 1, 3, false, 1, 7, 'Saloes que estao comecando o teste.', 'Comecar teste gratis', '{"tom":"entrada","badge":"Trial"}'::jsonb),
    ('basico', 'Basico', 'Essencial para organizar o salao', 'Agenda, clientes, servicos, caixa, comandas, vendas, comissao basica e WhatsApp manual pela agenda.', 5.00, 60.00, 2, 3, false, 2, 0, 'Salao pequeno que quer organizar a rotina com custo baixo.', 'Assinar Basico', '{"tom":"essencial","badge":"Entrada"}'::jsonb),
    ('pro', 'Pro', 'Mais controle para equipe em crescimento', 'Tudo do Basico com estoque, app profissional, app cliente, comissoes avancadas, relatorios e dashboard avancados.', 29.90, 358.80, 5, 10, true, 3, 0, 'Salao em crescimento que precisa controlar equipe, estoque e apps.', 'Assinar Pro', '{"tom":"crescimento","badge":"Mais escolhido"}'::jsonb),
    ('premium', 'Premium', 'Tudo liberado para operacao completa', 'Limites ilimitados, todos os recursos do Pro e suporte prioritario.', 59.90, 718.80, 999, 999, false, 4, 0, 'Salao com operacao grande que precisa de limites ilimitados e suporte prioritario.', 'Assinar Premium', '{"tom":"premium","badge":"Completo"}'::jsonb)
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
on conflict (codigo) do update set
  nome = excluded.nome,
  subtitulo = excluded.subtitulo,
  descricao = excluded.descricao,
  valor_mensal = excluded.valor_mensal,
  preco_anual = excluded.preco_anual,
  limite_usuarios = excluded.limite_usuarios,
  limite_profissionais = excluded.limite_profissionais,
  destaque = excluded.destaque,
  ordem = excluded.ordem,
  trial_dias = excluded.trial_dias,
  ideal_para = excluded.ideal_para,
  cta = excluded.cta,
  metadata = excluded.metadata,
  ativo = true,
  updated_at = now();

with matriz(codigo, recurso, habilitado, limite_numero, observacao) as (
  values
    ('teste_gratis', 'agenda', true, null, 'Agenda liberada no trial'),
    ('teste_gratis', 'agendamentos_mensais', true, 40, '40 agendamentos no periodo de teste'),
    ('teste_gratis', 'clientes', true, 100, 'Ate 100 clientes no trial'),
    ('teste_gratis', 'profissionais', true, 3, 'Ate 3 profissionais'),
    ('teste_gratis', 'usuarios', true, 1, 'Ate 1 usuario'),
    ('teste_gratis', 'servicos', true, 20, 'Ate 20 servicos'),
    ('teste_gratis', 'servicos_extras', true, null, 'Extras liberados no trial'),
    ('teste_gratis', 'produtos', true, null, 'Produtos liberados para venda'),
    ('teste_gratis', 'caixa', true, null, 'Caixa liberado'),
    ('teste_gratis', 'comandas', true, null, 'Comandas liberadas'),
    ('teste_gratis', 'vendas', true, null, 'Vendas liberadas'),
    ('teste_gratis', 'comissoes_basicas', true, null, 'Comissoes basicas'),
    ('teste_gratis', 'relatorios_basicos', true, null, 'Relatorios basicos'),
    ('teste_gratis', 'whatsapp', true, null, 'Link manual pela agenda'),
    ('teste_gratis', 'estoque', false, null, 'Disponivel no Pro'),
    ('teste_gratis', 'comissoes_avancadas', false, null, 'Disponivel no Pro'),
    ('teste_gratis', 'relatorios_avancados', false, null, 'Disponivel no Pro'),
    ('teste_gratis', 'dashboard_avancado', false, null, 'Disponivel no Pro'),
    ('teste_gratis', 'app_profissional', false, null, 'Disponivel no Pro'),
    ('teste_gratis', 'app_cliente', false, null, 'Disponivel no Pro'),
    ('teste_gratis', 'suporte_prioritario', false, null, 'Disponivel no Premium'),
    ('teste_gratis', 'campanhas', false, null, 'Fora da venda atual'),
    ('teste_gratis', 'marketing', false, null, 'Fora da venda atual'),
    ('teste_gratis', 'recursos_beta', false, null, 'Fora da venda atual'),
    ('basico', 'agenda', true, null, 'Agenda liberada'),
    ('basico', 'agendamentos_mensais', true, 250, '250 agendamentos por mes'),
    ('basico', 'clientes', true, 999, 'Clientes ilimitados'),
    ('basico', 'profissionais', true, 3, 'Ate 3 profissionais'),
    ('basico', 'usuarios', true, 2, 'Ate 2 usuarios'),
    ('basico', 'servicos', true, 80, 'Ate 80 servicos'),
    ('basico', 'servicos_extras', true, null, 'Servicos extras liberados'),
    ('basico', 'produtos', true, null, 'Produtos liberados para venda'),
    ('basico', 'caixa', true, null, 'Caixa liberado'),
    ('basico', 'comandas', true, null, 'Comandas liberadas'),
    ('basico', 'vendas', true, null, 'Vendas liberadas'),
    ('basico', 'comissoes_basicas', true, null, 'Comissoes basicas'),
    ('basico', 'relatorios_basicos', true, null, 'Relatorios basicos'),
    ('basico', 'whatsapp', true, null, 'Link manual pela agenda'),
    ('basico', 'estoque', false, null, 'Disponivel no Pro'),
    ('basico', 'comissoes_avancadas', false, null, 'Disponivel no Pro'),
    ('basico', 'relatorios_avancados', false, null, 'Disponivel no Pro'),
    ('basico', 'dashboard_avancado', false, null, 'Disponivel no Pro'),
    ('basico', 'app_profissional', false, null, 'Disponivel no Pro'),
    ('basico', 'app_cliente', false, null, 'Disponivel no Pro'),
    ('basico', 'suporte_prioritario', false, null, 'Disponivel no Premium'),
    ('basico', 'campanhas', false, null, 'Fora da venda atual'),
    ('basico', 'marketing', false, null, 'Fora da venda atual'),
    ('basico', 'recursos_beta', false, null, 'Fora da venda atual'),
    ('pro', 'agenda', true, null, 'Agenda liberada'),
    ('pro', 'agendamentos_mensais', true, 900, '900 agendamentos por mes'),
    ('pro', 'clientes', true, 999, 'Clientes ilimitados'),
    ('pro', 'profissionais', true, 10, 'Ate 10 profissionais'),
    ('pro', 'usuarios', true, 5, 'Ate 5 usuarios'),
    ('pro', 'servicos', true, 250, 'Ate 250 servicos'),
    ('pro', 'servicos_extras', true, null, 'Servicos extras liberados'),
    ('pro', 'produtos', true, null, 'Produtos liberados'),
    ('pro', 'estoque', true, null, 'Estoque liberado'),
    ('pro', 'caixa', true, null, 'Caixa liberado'),
    ('pro', 'comandas', true, null, 'Comandas liberadas'),
    ('pro', 'vendas', true, null, 'Vendas liberadas'),
    ('pro', 'comissoes_basicas', true, null, 'Comissoes basicas'),
    ('pro', 'comissoes_avancadas', true, null, 'Comissoes avancadas'),
    ('pro', 'relatorios_basicos', true, null, 'Relatorios basicos'),
    ('pro', 'relatorios_avancados', true, null, 'Relatorios avancados'),
    ('pro', 'dashboard_avancado', true, null, 'Dashboard avancado'),
    ('pro', 'app_profissional', true, null, 'App do profissional'),
    ('pro', 'app_cliente', true, null, 'App do cliente'),
    ('pro', 'whatsapp', true, null, 'Link manual pela agenda'),
    ('pro', 'suporte_prioritario', false, null, 'Disponivel no Premium'),
    ('pro', 'campanhas', false, null, 'Fora da venda atual'),
    ('pro', 'marketing', false, null, 'Fora da venda atual'),
    ('pro', 'recursos_beta', false, null, 'Fora da venda atual'),
    ('premium', 'agenda', true, null, 'Agenda liberada'),
    ('premium', 'agendamentos_mensais', true, 999, 'Ilimitado'),
    ('premium', 'clientes', true, 999, 'Clientes ilimitados'),
    ('premium', 'profissionais', true, 999, 'Ilimitado'),
    ('premium', 'usuarios', true, 999, 'Ilimitado'),
    ('premium', 'servicos', true, 999, 'Ilimitado'),
    ('premium', 'servicos_extras', true, null, 'Servicos extras liberados'),
    ('premium', 'produtos', true, null, 'Produtos liberados'),
    ('premium', 'estoque', true, null, 'Estoque liberado'),
    ('premium', 'caixa', true, null, 'Caixa liberado'),
    ('premium', 'comandas', true, null, 'Comandas liberadas'),
    ('premium', 'vendas', true, null, 'Vendas liberadas'),
    ('premium', 'comissoes_basicas', true, null, 'Comissoes basicas'),
    ('premium', 'comissoes_avancadas', true, null, 'Comissoes avancadas'),
    ('premium', 'relatorios_basicos', true, null, 'Relatorios basicos'),
    ('premium', 'relatorios_avancados', true, null, 'Relatorios avancados'),
    ('premium', 'dashboard_avancado', true, null, 'Dashboard avancado'),
    ('premium', 'app_profissional', true, null, 'App do profissional'),
    ('premium', 'app_cliente', true, null, 'App do cliente'),
    ('premium', 'whatsapp', true, null, 'Link manual pela agenda'),
    ('premium', 'suporte_prioritario', true, null, 'Suporte prioritario'),
    ('premium', 'campanhas', false, null, 'Fora da venda atual'),
    ('premium', 'marketing', false, null, 'Fora da venda atual'),
    ('premium', 'recursos_beta', false, null, 'Fora da venda atual')
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
