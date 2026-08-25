# Arquitetura modular do painel

Os maiores fluxos do painel usam uma fachada pública pequena e mantêm a implementação operacional dentro de `internal/`. Tipos, constantes, formatadores e componentes auxiliares que não pertencem à orquestração da tela ficam em módulos de suporte ao lado do `Core`.

Escopo desta organização:

- Perfil do Salão: `perfil-salao-support.tsx`
- Relatório Financeiro: `relatorio-financeiro-support.tsx`
- Configurações: `configuracoes-workspace-support.ts`
- Agenda: `agenda-workspace-support.ts`
- Vendas: `vendas-workspace-support.ts`
- Comissões: `comissoes-workspace-support.tsx`
- Profissionais: `profissional-form-support.ts`
- Clientes: `cliente-form-defaults.ts` e `ClienteFormFields.tsx`

A regra é manter consultas, permissões e fluxos de negócio preservados durante refatorações estruturais. Novas responsabilidades reutilizáveis devem ser adicionadas ao módulo de suporte apropriado, evitando voltar a concentrar tipos, helpers e UI genérica dentro do componente orquestrador.
