# Autenticação

## Visão geral

O sistema utiliza Supabase Auth para autenticação e a tabela `usuarios` para armazenar os dados de negócio do usuário dentro do salão.

## Estrutura

### Supabase Auth
Responsável por:
- login
- sessão
- recuperação de senha
- autenticação base

### Tabela `usuarios`
Responsável por:
- `id`
- `id_salao`
- `nome`
- `email`
- `nivel`
- `status`
- `auth_user_id`

## Fluxo de criação de usuário

1. validar se o usuário atual tem permissão
2. validar limite de usuários do plano
3. validar se o e-mail já existe no salão
4. criar usuário no Supabase Auth
5. gravar usuário na tabela `usuarios`
6. salvar `auth_user_id`

## Fluxo de atualização

1. localizar usuário pelo `id` e `id_salao`
2. validar conflito de e-mail
3. atualizar Supabase Auth, se houver `auth_user_id`
4. atualizar tabela `usuarios`

## Fluxo de exclusão

1. localizar usuário pelo `id` e `id_salao`
2. impedir exclusão do último admin do salão
3. remover registros relacionados em `usuarios_permissoes`
4. remover da tabela `usuarios`
5. tentar remover do Supabase Auth pelo `auth_user_id`

## Multi-tenant

Toda consulta deve respeitar `id_salao`.

## Regras importantes

- usuário inativo não deve operar o sistema
- nenhuma rota sensível deve confiar apenas no client
- operações administrativas devem rodar no server