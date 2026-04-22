# LGPD + IA Hardening Checklist

## Dados enviados para IA

- [ ] Nao enviar telefone de cliente
- [ ] Nao enviar email de cliente
- [ ] Nao enviar CPF
- [ ] Nao enviar endereco
- [ ] Nao enviar observacoes clinicas/sensiveis
- [ ] Reduzir nome do cliente para primeiro nome quando possivel
- [ ] Restringir contexto ao minimo operacional necessario

## Prompts

- [ ] Prompt do sistema proibe revelar PII
- [ ] Prompt do sistema orienta a nao inventar dados
- [ ] Prompt do sistema manda recusar pedido de dado pessoal sem autorizacao
- [ ] Historico do chat passa por sanitizacao

## Cookies e subdominios

- [ ] APP_ROOT_DOMAIN configurado
- [ ] APP_LOGIN_HOST configurado
- [ ] APP_MAIN_HOST configurado
- [ ] Cookies sensiveis com httpOnly
- [ ] Cookies sensiveis com secure em producao
- [ ] Cookies sensiveis com sameSite definido
- [ ] Cookies sensiveis com domain padronizado

## Headers

- [ ] HSTS ativo
- [ ] CSP ativa
- [ ] X-Frame-Options ativo
- [ ] X-Content-Type-Options ativo
- [ ] Referrer-Policy ativa
- [ ] Permissions-Policy ativa
- [ ] Rotas internas com noindex

## Teste manual

- [ ] Suporte IA responde sem mostrar email/telefone/CPF
- [ ] Login funciona em subdominio correto
- [ ] Logout limpa cookie
- [ ] Recuperacao de senha cai no host de login
- [ ] Painel e app profissional continuam funcionais
