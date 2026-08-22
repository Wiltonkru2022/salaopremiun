# Permissões e Autorização

## Princípio

Permissão visual melhora UX; autorização real acontece no servidor, RPC ou policy.

```text
UI pode ocultar botão
        ↓
API/Action valida sessão
        ↓
valida nível/permissão
        ↓
valida id_salao/recurso
        ↓
executa operação
```

## Painel do salão

Níveis conhecidos incluem:

- `admin`;
- `gerente`;
- `recepcao`;
- `profissional`.

O sistema combina nível padrão e permissões customizadas quando necessário.

Exemplos de permissões de negócio:

- dashboard;
- agenda;
- clientes;
- profissionais;
- serviços;
- produtos/estoque;
- comandas/vendas;
- caixa e pagamentos;
- comissões;
- relatórios;
- marketing;
- configurações;
- assinatura.

### Regras

- `admin`: acesso amplo do salão, mas não vira Admin Master automaticamente;
- `gerente`: operação/gestão conforme permissões;
- `recepcao`: rotina de atendimento conforme permissões;
- `profissional`: escopo restrito e, quando usa o PWA, também limitado pela sessão profissional.

## App Profissional Vite

O profissional recebe somente o contexto permitido pelas APIs do App Profissional. A aplicação deve validar capacidades como visão de agenda de terceiros, edição de cliente/serviço, comandas e ações financeiras no backend.

Nunca autorizar uma RPC sensível apenas com `id_profissional` fornecido pelo navegador.

## App Cliente

Cliente não compartilha níveis administrativos. Suas permissões derivam da própria identidade, do vínculo com agendamentos e das regras públicas/privadas do salão.

## Admin Master

Admin Master possui autorização separada. Ser admin de um salão não concede acesso ao Admin Master.

## Multi-tenant

Toda operação de salão precisa confirmar:

- salão da sessão;
- salão do recurso;
- status do usuário/profissional;
- permissão para a ação.

## Checklist para nova feature

- [ ] qual superfície executa a ação?
- [ ] qual sessão é válida?
- [ ] existe `id_salao`?
- [ ] precisa de `id_profissional`?
- [ ] qual permissão/nível é exigido?
- [ ] o servidor valida tudo novamente?
- [ ] erro retorna `401/403` sem vazar dados?
- [ ] ação crítica gera log?
- [ ] teste multi-tenant cobre acesso cruzado?