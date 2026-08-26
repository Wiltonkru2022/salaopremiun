create or replace function public.fn_cadastrar_salao_transacional(
  p_auth_user_id uuid,
  p_email text,
  p_nome_salao text,
  p_responsavel text,
  p_whatsapp text default null,
  p_cpf_cnpj text default null,
  p_cep text default null,
  p_endereco text default null,
  p_numero text default null,
  p_complemento text default null,
  p_bairro text default null,
  p_cidade text default null,
  p_estado text default null,
  p_plano_interesse text default null,
  p_origem text default 'cadastro_salao'
)
returns table(id_salao uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_salao uuid;
  v_id_usuario uuid;
begin
  insert into public.saloes (
    nome,
    responsavel,
    whatsapp,
    telefone,
    email,
    cpf_cnpj,
    cep,
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    status,
    trial_ativo,
    trial_inicio_em,
    trial_fim_em,
    plano,
    limite_profissionais,
    limite_usuarios
  )
  values (
    p_nome_salao,
    p_responsavel,
    p_whatsapp,
    p_whatsapp,
    p_email,
    p_cpf_cnpj,
    p_cep,
    p_endereco,
    p_numero,
    p_complemento,
    p_bairro,
    p_cidade,
    p_estado,
    'pendente',
    false,
    null,
    null,
    null,
    0,
    0
  )
  returning id into v_id_salao;

  insert into public.usuarios (
    auth_user_id,
    email,
    nome,
    id_salao,
    nivel,
    status
  )
  values (
    p_auth_user_id,
    p_email,
    p_responsavel,
    v_id_salao,
    'admin',
    'ativo'
  )
  returning id into v_id_usuario;

  insert into public.configuracoes_salao (
    id_salao,
    hora_abertura,
    hora_fechamento,
    intervalo_minutos,
    dias_funcionamento
  )
  values (
    v_id_salao,
    '08:00',
    '18:00',
    30,
    '["segunda","terca","quarta","quinta","sexta","sabado"]'::jsonb
  );

  insert into public.logs_sistema (
    gravidade,
    modulo,
    id_salao,
    id_usuario,
    mensagem,
    detalhes_json
  )
  values (
    'info',
    'cadastro_salao',
    v_id_salao,
    v_id_usuario,
    'Salao cadastrado pendente de ativacao comercial.',
    jsonb_build_object(
      'origem', p_origem,
      'plano_interesse', p_plano_interesse,
      'status_inicial', 'pendente'
    )
  );

  return query select v_id_salao;
end;
$$;

grant execute on function public.fn_cadastrar_salao_transacional(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
