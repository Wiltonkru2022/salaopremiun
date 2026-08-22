# Contas de Teste e Fixtures E2E

Nunca salve senha real, token ou cookie no Git.

## Provisionamento

```bash
npm run e2e:provision
npm run e2e:playwright
```

O provisionador pode gravar credenciais locais em arquivo ignorado pelo Git. Esse arquivo é efêmero e deve permanecer somente no ambiente de desenvolvimento/teste.

## Personas

| Persona | Uso |
| --- | --- |
| Salão Básico E2E | painel e limites de plano |
| Salão Pro E2E | painel e recursos Pro |
| Salão Premium E2E | painel, marketplace e recursos Premium |
| Profissional E2E | **App Profissional Vite** e APIs profissionais |
| Cliente App E2E | App Cliente, perfil e agendamentos |
| Admin Master E2E | administração global |

## Regra do App Profissional

Qualquer teste profissional deve validar `apps/app-profissional-vite`/bundle publicado. Não criar fixture ou roteiro dependente da antiga implementação `app/app-profissional`.

## Segurança

- não commitar `.codex-test-accounts.local.json` ou equivalente;
- não usar credencial real de cliente em E2E;
- preferir dados sintéticos;
- limpar salões temporários criados por testes destrutivos;
- separar sandbox Asaas de produção;
- mutações externas precisam de flags explícitas;
- nunca imprimir Service Role/segredos no relatório.

## Reteste

Fixtures de plano/assinatura podem expirar. Antes de diagnosticar 403/404 como bug de aplicação, confirme o estado comercial do fixture e reprovisione quando apropriado.