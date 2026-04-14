# SalaoPremium

Sistema SaaS para gestão de salões de beleza, com foco em agenda, caixa, comandas, clientes, profissionais, comissões, relatórios e assinatura.

## Visão Geral

O SalaoPremium é uma aplicação multi-tenant, onde cada salão possui seus próprios dados isolados por `id_salao`.

## Principais Módulos

- Dashboard
- Agenda
- Clientes
- Profissionais
- Serviços
- Produtos
- Estoque
- Caixa
- Comandas
- Comissões
- Relatórios
- Configurações
- Assinatura
- Gestão de usuários e permissões

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- Lucide React

## Arquitetura

- Multi-tenant por `id_salao`
- Autenticação via Supabase Auth
- Dados complementares do usuário na tabela `usuarios`
- Controle de permissões por nível e, quando necessário, por permissões específicas

## Comandos

```bash
npm run lint
npm run typecheck
npm run build
```

## Produção

Antes de publicar, confira as variáveis de ambiente em `.env.example` e o checklist em `docs/producao.md`.

## Estrutura Básica

```bash
app/
components/
lib/
types/
public/
```
