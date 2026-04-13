# Permissões

## Níveis de usuário

- `admin`
- `gerente`
- `recepcao`
- `profissional`

## Estratégia

O sistema usa duas camadas:

1. permissão por nível
2. permissão customizada por usuário, quando necessário

## Exemplo de permissões

- `dashboard_ver`
- `agenda_ver`
- `clientes_ver`
- `profissionais_ver`
- `servicos_ver`
- `produtos_ver`
- `estoque_ver`
- `comandas_ver`
- `vendas_ver`
- `caixa_ver`
- `caixa_editar`
- `caixa_operar`
- `caixa_finalizar`
- `caixa_pagamentos`
- `comissoes_ver`
- `relatorios_ver`
- `marketing_ver`
- `configuracoes_ver`
- `assinatura_ver`

## Regra base por nível

### admin
Acesso total

### gerente
Acesso operacional e gerencial, sem controle total de sistema em alguns casos

### recepcao
Acesso a agenda, clientes, vendas e caixa conforme regra definida

### profissional
Acesso restrito ao que for necessário para operação individual

## Boas práticas

- validar no client para UX
- validar novamente no server para segurança
- nunca confiar apenas no front-end