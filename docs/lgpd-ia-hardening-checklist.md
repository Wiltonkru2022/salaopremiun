# Checklist LGPD + IA

## Minimização de dados

- [ ] não enviar CPF completo para IA sem necessidade e base autorizada;
- [ ] não enviar telefone/e-mail/endereço quando não forem necessários;
- [ ] não enviar observações sensíveis fora do contexto estritamente necessário;
- [ ] reduzir nomes/identificadores quando possível;
- [ ] remover tokens, cookies e segredos de todo contexto de IA;
- [ ] definir retenção para históricos e logs.

## Superfícies

### Painel

- [ ] usuário/salão/permissão validados antes de recuperar contexto;
- [ ] Service Role nunca exposta ao client.

### App Cliente

- [ ] CPF e nascimento não aparecem em logs comuns;
- [ ] recuperação não revela existência da conta desnecessariamente;
- [ ] códigos de verificação possuem expiração/uso limitado.

### App Profissional Vite

- [ ] somente publishable key pública no bundle;
- [ ] `PROFISSIONAL_SESSION_SECRET` permanece no backend;
- [ ] suporte/IA não envia dados de clientes além do necessário;
- [ ] cache local não armazena segredo administrativo.

## Prompts e suporte

- [ ] instruções proíbem exposição de PII/segredos;
- [ ] histórico é sanitizado;
- [ ] modelo não recebe payload bruto de banco/webhook por padrão;
- [ ] resposta não inventa dado pessoal;
- [ ] fallback humano existe quando necessário.

## Cookies e domínios

- [ ] hosts canônicos configurados;
- [ ] cookies sensíveis `HttpOnly` quando aplicável;
- [ ] `Secure` em produção;
- [ ] `SameSite` adequado;
- [ ] logout invalida sessão relevante.

## Headers

- [ ] HSTS;
- [ ] CSP;
- [ ] X-Frame-Options/`frame-ancestors`;
- [ ] X-Content-Type-Options;
- [ ] Referrer-Policy;
- [ ] Permissions-Policy;
- [ ] rotas administrativas/noindex quando apropriado.

## Teste manual

- [ ] Painel não cruza salões;
- [ ] App Cliente não revela PII de terceiros;
- [ ] App Profissional Vite só vê o salão/profissional autorizado;
- [ ] suporte IA não mostra CPF/e-mail/telefone sem necessidade;
- [ ] logout funciona em todas as superfícies.