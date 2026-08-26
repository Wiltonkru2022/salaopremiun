# Checklist de Go-Live do SalãoPremium

Use antes de liberar venda/uso real em produção.

## 1. Segredos e ambientes

- [ ] URLs Neon configuradas somente no servidor;
- [ ] chaves Clerk e Cloudinary configuradas conforme `.env.example`;
- [ ] `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_WEBHOOK_TOKEN` corretos;
- [ ] `BREVO_API_KEY` configurada se e-mail estiver ativo;
- [ ] `CRON_SECRET` definido;
- [ ] `PROFISSIONAL_SESSION_SECRET` forte;
- [ ] `CLIENT_APP_RECOVERY_SECRET` definido;
- [ ] VAPID configurado se push estiver ativo;
- [ ] nenhum segredo inserido em variáveis `NEXT_PUBLIC_*`/`VITE_*`.

## 2. Domínios e proxy

- [ ] site raiz;
- [ ] host `login`;
- [ ] host `painel`;
- [ ] host `app`;
- [ ] host `cadastro`;
- [ ] host `assinatura`;
- [ ] blog, se ativo;
- [ ] `/api/webhooks/asaas` não sofre redirect indevido;
- [ ] `npm run e2e:proxy` passa.

## 3. App Profissional oficial

- [ ] fonte é `apps/app-profissional-vite`;
- [ ] `npm run typecheck:professional` passa;
- [ ] `npm run build:professional` passa;
- [ ] bundle foi publicado em `public/app-profissional`;
- [ ] `app.salaopremiun.com.br/app-profissional/` abre o Vite;
- [ ] não existe uma segunda UI Next concorrente;
- [ ] login, agenda, clientes, serviços, comandas, comissões e logout funcionam;
- [ ] instalação PWA/offline/push testados.

## 4. App Cliente

- [ ] cadastro com CPF+nascimento+WhatsApp;
- [ ] login CPF+nascimento;
- [ ] recuperação de acesso;
- [ ] explorar salões;
- [ ] perfil do salão;
- [ ] reserva completa com disponibilidade real;
- [ ] agendamentos e notificações;
- [ ] favoritar/compartilhar;
- [ ] PWA/push em dispositivo real.

## 5. Neon

- [ ] `npx database db push --dry-run` revisado quando aplicável;
- [ ] migrations remotas atualizadas;
- [ ] backup/restore conhecido;
- [ ] RLS multi-tenant revisada;
- [ ] `npm run audit:database-contract` passa;
- [ ] `npm run audit:service-role` passa.

## 6. Asaas

Homologar no ambiente correto:

- [ ] criação;
- [ ] confirmação/recebimento;
- [ ] atraso;
- [ ] cancelamento/estorno;
- [ ] idempotência do webhook;
- [ ] reconciliação de assinatura;
- [ ] webhook apontando para `/api/webhooks/asaas`.

## 7. Multi-tenant

- [ ] criar/usar dois salões de teste;
- [ ] usuário do salão A não lê/altera salão B;
- [ ] profissional A não acessa dados do profissional/salão B;
- [ ] cliente só altera recursos próprios;
- [ ] Admin Master mantém escopo privilegiado auditado.

## 8. Admin Master

- [ ] login/guard;
- [ ] saúde operacional;
- [ ] webhooks;
- [ ] assinaturas/cobranças;
- [ ] salões e planos;
- [ ] tickets;
- [ ] alertas/incidentes;
- [ ] ações críticas geram log.

## 9. LGPD e segurança

- [ ] nenhuma senha em log;
- [ ] CPF/telefone/e-mail minimizados;
- [ ] IA recebe apenas contexto necessário;
- [ ] headers de segurança ativos;
- [ ] cookies seguros;
- [ ] dependências auditadas;
- [ ] retenção de logs/dados definida.

## 10. Operação comercial

- [ ] planos/preços conferem com banco e site;
- [ ] limites de plano testados;
- [ ] termos e privacidade publicados;
- [ ] processo de suporte definido;
- [ ] rollback Vercel conhecido;
- [ ] processo de indisponibilidade/pagamento definido;
- [ ] responsável por incidentes e comunicação identificado.

## Comando final

```bash
npm run validate:release
```

Go-live só deve ocorrer com evidência do deployment atual, não com resultado antigo.
