# Oracle VPS + API SalaoPremium

Este documento registra a arquitetura atual da VPS Oracle e o caminho correto para evoluir a API auxiliar do SalaoPremium sem prejudicar Vercel, Supabase ou a seguranca do sistema.

Ultima atualizacao: 14/05/2026.

## Estrutura Atual

```text
Frontend, site, painel e apps -> Vercel
Banco, Auth e Storage          -> Supabase
Pagamentos                     -> Asaas
Codigo                         -> GitHub
API auxiliar, workers e jobs   -> Oracle VPS
DNS                            -> Registro.br
```

## VPS

```text
Provedor: Oracle Cloud
Regiao: US East / Ashburn
Sistema: Ubuntu 24.04
Shape: VM.Standard.A1.Flex
CPU/RAM atual: 1 OCPU / 6 GB RAM
IP publico: 150.136.75.211
Dominio API: api.salaopremiun.com.br
Usuario SSH: ubuntu
API local: /opt/salaopremium-api
```

## Instalado na VPS

```text
Docker
Docker Compose
Portainer
Nginx Proxy Manager
UFW Firewall
Fail2ban
Git
Curl
API auxiliar salaopremium-api
Backup local de /opt/salaopremium-api
```

## Portas

Publico na Oracle e no Ubuntu:

```text
22   SSH
80   HTTP
443  HTTPS
```

Privado/local, acessar somente por tunel SSH quando precisar:

```text
81    Nginx Proxy Manager
9000  Portainer
```

Regra: nao expor `81` e `9000` publicamente. Se precisar acessar, use tunel SSH ou libere temporariamente por IP confiavel e depois feche novamente.

## Dominios

```text
salaopremiun.com.br              -> Vercel
www.salaopremiun.com.br          -> Vercel
painel.salaopremiun.com.br       -> Vercel
login.salaopremiun.com.br        -> Vercel
app.salaopremiun.com.br          -> Vercel
assinatura.salaopremiun.com.br   -> Vercel
cadastro.salaopremiun.com.br     -> Vercel
blog.salaopremiun.com.br         -> Vercel
api.salaopremiun.com.br          -> Oracle VPS
```

## O Que Vai na VPS

Colocar na VPS, aos poucos:

```text
API auxiliar do SalaoPremium
Monitoramento operacional
Workers leves
Calculos demorados
Relatorios pesados
Jobs de notificacoes
Backups controlados
Webhooks internos
Webhooks externos quando a migracao estiver segura
```

Nao colocar agora:

```text
Banco principal PostgreSQL
Substituto do Supabase Auth
Storage de imagens
Frontend completo
Blog
Painel principal completo
```

## Fluxo Correto

```text
Usuario acessa painel/app na Vercel
        ↓
Vercel chama api.salaopremiun.com.br
        ↓
Oracle processa job/regra auxiliar
        ↓
Oracle consulta ou registra dados no Supabase, quando for seguro
        ↓
Resposta volta para o painel/app
```

## API Atual

A API atual roda no container:

```text
container_name: salaopremium-api
porta interna: 8080
dominio publico: https://api.salaopremiun.com.br
```

Rotas publicas:

```text
GET /health
GET /ready
GET /version
GET /uptime
GET /status
```

Rotas protegidas por token:

```text
GET  /admin/system
GET  /admin/heartbeat
POST /jobs/ping
GET  /admin/jobs
POST /jobs/backup/supabase
GET  /admin/backups
POST /jobs/notifications/process
GET  /admin/notifications/jobs
POST /jobs/reports/generate
GET  /admin/reports/jobs
POST /monitoring/event
GET  /admin/monitoring/summary
GET  /admin/monitoring/errors
GET  /admin/monitoring/performance
POST /webhooks/internal
GET  /admin/webhooks
POST /webhooks/asaas
POST /webhooks/resend
POST /webhooks/meta
```

## Integracao com Admin Master

No projeto principal, a integracao usa:

```env
ORACLE_VPS_API_URL=https://api.salaopremiun.com.br
ORACLE_VPS_API_TOKEN=
```

Na VPS, o mesmo token fica como:

```env
API_ADMIN_TOKEN=
```

O Admin Master em `Saude operacional` mostra:

```text
VPS online/offline
memoria
disco
uptime
jobs recentes
ultimos erros
rotas lentas
botao Enviar ping
backup metadata-only
processamento leve de notificacoes
relatorio leve
```

## Variaveis da API na VPS

Arquivo real:

```text
/opt/salaopremium-api/.env
```

Base:

```env
NODE_ENV=production
PORT=8080
SERVICE_NAME=salaopremium-api
APP_VERSION=0.3.0
API_ADMIN_TOKEN=
DATA_DIR=/data
MAX_NDJSON_LINES=500
RETENTION_DAYS=7

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=

CRON_SECRET=
API_SECRET=

RESEND_API_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_SUBJECT=mailto:suporte@salaopremiun.com.br
```

Compatibilidade: a API tambem aceita `WEB_PUSH_VAPID_PRIVATE_KEY` e `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`, mas o padrao atual dos projetos e `WEB_PUSH_PRIVATE_KEY` e `WEB_PUSH_PUBLIC_KEY`.

Nunca colocar `SUPABASE_SERVICE_ROLE_KEY`, `API_ADMIN_TOKEN`, Asaas, Resend ou chave privada de Web Push no frontend.

## Docker Compose Atual

```yaml
services:
  salaopremium-api:
    build: .
    container_name: salaopremium-api
    restart: unless-stopped
    env_file:
      - .env
    environment:
      DATA_DIR: /data
    volumes:
      - ./data:/data
    networks:
      - proxy_default

networks:
  proxy_default:
    external: true
```

No Nginx Proxy Manager:

```text
Domain: api.salaopremiun.com.br
Scheme: http
Forward Hostname/IP: salaopremium-api
Forward Port: 8080
SSL: ativo
Force SSL: ativo
```

## Ordem de Migracao

Migrar para a VPS aos poucos:

```text
1. Monitoramento e heartbeat
2. Jobs leves e metadata-only
3. Webhook do Asaas em modo espelho
4. Relatorios de vendas
5. Calculo de comissao
6. Fechamento de caixa
7. Jobs/notificacoes
8. Backup automatico real e compactado
9. Comandas
10. Agenda
```

Regra: primeiro espelhar e auditar, depois trocar o caminho oficial.

## Seguranca Obrigatoria

```text
Nao expor PostgreSQL publicamente
Nao expor Redis publicamente
Nao expor Portainer/NPM publicamente
Nao colocar service_role no navegador
Validar id_salao em tudo
Validar plano/recurso no servidor
Validar webhook Asaas com token
Usar HTTPS sempre
Fazer backup antes de migrar regra critica
Manter Fail2ban ativo
Manter UFW ativo
Nao usar VPS para spam, proxy publico, mineracao, IPTV ou trafego fake
```

## Comandos Uteis

Conectar:

```powershell
ssh -i .\ssh-key-2026-05-12.key ubuntu@150.136.75.211
```

Ver containers:

```bash
docker ps
```

Ver logs da API:

```bash
docker logs salaopremium-api --tail=100
```

Reiniciar API:

```bash
docker restart salaopremium-api
```

Rebuild da API:

```bash
cd /opt/salaopremium-api
docker compose up -d --build
```

Uso da VPS:

```bash
htop
df -h
free -h
docker stats
```

Status publico:

```bash
curl https://api.salaopremiun.com.br/status
curl https://api.salaopremiun.com.br/ready
```

## Sua VPS Aguenta?

Sim, para o estagio atual.

Com `1 OCPU / 6 GB RAM`, aguenta:

```text
API leve/media
webhooks
relatorios normais
calculos de comissao
caixa
workers pequenos
Portainer privado
Nginx Proxy Manager
```

Evitar por enquanto:

```text
muitos containers pesados
Postgres principal local
IA pesada
milhares de saloes em jobs simultaneos
relatorios gigantes simultaneos
```

Quando puder, subir para:

```text
2 OCPU / 12 GB RAM
```

## API Separada

A API separada ja existe em:

```text
https://github.com/Wiltonkru2022/salaopremiun-api
```

Este documento registra a operacao da VPS. O README do repositorio da API e a fonte principal para rotas, Docker, deploy e variaveis da API auxiliar.

## Validacao Real Antes de Dizer 100%

Documentacao nao substitui teste de producao. Antes de considerar o sistema pronto, valide:

```bash
npm run lint
npm run typecheck
npm run build
npm run launch:validate
```

Tambem valide em producao:

- `https://api.salaopremiun.com.br/health`
- `https://api.salaopremiun.com.br/ready`
- `https://api.salaopremiun.com.br/status`
- Admin Master lendo a VPS sem erro.
- Google Calendar conectado/desconectado.
- App Cliente e App Profissional sem queda de sessao.
- Agenda, caixa, assinatura, planos e recursos.

## Regra Final

A VPS e auxiliar. O coracao do SaaS continua:

```text
Vercel + Supabase + Asaas + Resend
```

Antes de migrar qualquer regra critica para a VPS:

```text
1. manter o fluxo antigo funcionando;
2. criar rota nova em modo espelho;
3. comparar resultado;
4. registrar logs no Admin Master;
5. fazer rollback simples;
6. so depois ativar como caminho oficial.
```
