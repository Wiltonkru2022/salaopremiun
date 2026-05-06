# Contas de teste locais

Use este fluxo para criar contas E2E sem salvar senha real no git:

```bash
node scripts/e2e/provision-test-accounts.mjs
node scripts/e2e/playwright-full-smoke.mjs
```

O provisionador grava as credenciais reais em `.codex-test-accounts.local.json`, que fica ignorado pelo git. Esse arquivo e para consulta local do Codex/desenvolvedor durante testes.

## Personas criadas

| Persona | Plano | Onde testa |
| --- | --- | --- |
| Salao Basico E2E | `basico` | painel do salao e bloqueios de plano |
| Salao Pro E2E | `pro` | painel, app profissional e recursos Pro |
| Salao Premium E2E | `premium` | painel, app profissional e marketplace do app cliente |
| Cliente App E2E | conta global | app cliente, perfil e agendamentos |
| Admin Master E2E | owner E2E | Admin Master e editor do blog |

Nunca coloque senha real no `README.md` nem neste arquivo. Quando precisar recriar tudo, rode o provisionador de novo.
