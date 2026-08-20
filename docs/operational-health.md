# Saúde Operacional Autônoma — SalãoPremium

## Objetivo

A Saúde Operacional é uma camada de observabilidade **best effort**: se ela falhar, o fluxo principal do usuário deve continuar funcionando sempre que possível. Ela não considera ausência de logs como prova de saúde e nunca converte `unknown` em verde.

## Estado antes desta implementação

Snapshot auditado em 19/08/2026:

- `health_checks_sistema` sem checks registrados;
- incidentes persistiam abertos até ação manual;
- a leitura antiga usava limites de UI (300 eventos, 20 incidentes, 12 health checks) como parte do cálculo;
- havia 31 incidentes classificados como abertos no snapshot solicitado pelo Admin Master;
- 31 não tinham ocorrência havia mais de 6 horas e 28 havia mais de 24 horas;
- telemetria recente estava muito concentrada no navegador;
- React #418 em `/app-cliente/agendamentos` era capturado também como `chunk_load_failed`;
- falhas normais de login podiam virar incidente crítico;
- erros de deployments antigos podiam manter o painel vermelho.

Nenhum desses números deve ser reutilizado como uptime histórico.

## Arquitetura

### Registro central

`config/operational-components.json` é a fonte versionada do catálogo conhecido. O ciclo operacional sincroniza o registro para `operational_components` e as relações para `operational_component_dependencies`.

Cada componente possui criticidade, owner por domínio, visibilidade pública, tipo de probe, frequência, TTL/freshness e dependências. `Responsável` é domínio/equipe (ex.: `App Cliente`, `Infra/Backend`) enquanto não houver ownership nominal comprovado.

### Probes

`runOperationalProbes()` executa checks leves. Não cria agendamento, cobrança, cliente, e-mail ou pagamento fictício.

Princípios:

- leitura canário com `limit(1)` para banco;
- endpoints HTTP sem mutação;
- probes de configuração guardam apenas booleano configurado/não configurado;
- segredos nunca entram em evidência;
- integrações sem tráfego suficiente ficam `unknown`, não verdes;
- histórico saudável é amostrado no máximo uma vez por hora; falhas e mudança de estado são preservadas.

### Freshness

Cada check possui `freshness_ttl_segundos`. Se o monitor deveria rodar e está atrasado, o componente fica `unknown` para o agregador público/interno.

### Anti-flapping

A função atômica `fn_operational_record_probe` mantém sucessos/falhas consecutivos e só muda o estado quando o threshold do componente é atingido. Recuperação exige, por padrão, três probes saudáveis consecutivos.

### Incidentes

Estados suportados:

`detectado -> aberto -> investigando -> recuperando -> resolvido`

Também existem `recorrente`, `suprimido` e `manutencao`.

O fingerprint normaliza UUIDs, IDs variáveis, query strings, tokens, timestamps, e-mail e números longos antes do SHA-256. O banco usa advisory lock por fingerprint para impedir duplicatas em concorrência.

### Resolução automática

`reconcileOperationalIncidents()` **não** usa apenas ausência de erro. Para resolver automaticamente combina:

1. janela sem nova ocorrência;
2. probe do componente fresco;
3. N probes saudáveis consecutivos;
4. estado do componente `operational`;
5. taxa de erro abaixo do limite;
6. dependências críticas saudáveis;
7. evidência do deployment/commit atual;
8. ausência de evidência contraditória posterior.

A resolução salva `resolution_mode`, confiança, deployment, commit, evidências, motivo e versão do reconciliador. Se o fingerprint voltar, a função atômica reabre o incidente e preserva a timeline.

### Erro de usuário

Senha/CPF inválido, validação e sessão expirada são telemetria/segurança, mas uma ocorrência isolada não é outage. O catálogo define `opensIncident=false` nesses casos. Anomalias agregadas de autenticação continuam podendo ser analisadas como segurança.

## React #418

A causa encontrada em `ClientAppointmentsManager` era texto de data/hora calculado por `Intl.DateTimeFormat` sem timezone explícito durante a primeira renderização de um Client Component. Node SSR e navegador podiam produzir textos diferentes.

A correção reutiliza `lib/timezones.ts` e o timezone cadastrado do salão. O servidor transforma o instante em um valor local determinístico antes de entregar ao primeiro render. Não foi usado `suppressHydrationWarning` para esconder o problema.

O runtime de chunks também foi corrigido: referência a um arquivo em `/_next/static/chunks/` não é prova de `ChunkLoadError`. React #418 agora é `react_hydration_mismatch`; recuperação de cache/reload só acontece para falhas reais de asset.

## Catálogo de erros

`lib/monitoring/error-catalog.ts` contém regras extensíveis. Todo erro não reconhecido cai em `unknown_operational_error`, com contexto sanitizado e ação de investigação.

Cada regra descreve sintoma, impacto operacional, causas prováveis, evidência necessária, owner, ação recomendada, risco de automação e condição de recuperação.

## Risco de automação

- **SAFE_AUTO**: reconciliar estado, repetir probe, invalidar estado temporário seguro, confirmar recuperação por evidência.
- **APPROVAL_REQUIRED**: rollback, mudança relevante de configuração, intervenção que possa afetar usuários.
- **FORBIDDEN_AUTO**: apagar dados, desabilitar RLS, liberar permissões, remover tabela, rotacionar segredo sem fluxo controlado, remover índice por advisor.

## Segurança e Supabase Advisors

Findings do Advisor são armazenáveis em `operational_security_findings` como `falha_operacional`, `risco_seguranca`, `recomendacao`, `configuracao_intencional` ou `precisa_revisao`. INFO/WARN não mudam o status público automaticamente.

No snapshot de 19/08/2026 existem vários `RLS Enabled No Policy` em tabelas server-only/internas e WARNs de funções `SECURITY DEFINER` executáveis por `authenticated`, além de proteção contra senha vazada desabilitada. Eles precisam de revisão de intenção/permissões; esta feature não desabilita RLS nem altera essas funções cegamente.

## Edge Functions

A auditoria dos projetos Supabase principal e blog em 19/08/2026 encontrou **zero Edge Functions implantadas** nesses dois projetos. Os nomes históricos `enviar-push-notificacao`, `send-push-notification` e `send-whatsapp-whatsapp-api` não foram excluídos nem tratados como saudáveis: permanecem como legado/não detectado até existir prova de implantação ou obsolescência.

## Custos e retenção

Pensado para o plano limitado do Supabase:

- eventos existentes seguem a retenção de `fn_observability_retention_cleanup`;
- probes saudáveis detalhados: 30 dias, com sampling;
- timeline interna de incidentes: 365 dias;
- entregas de e-mail de status: 180 dias;
- incidentes/estado atual permanecem agregados;
- queries de health usam agregações e índices; limites de UI não definem a verdade operacional.

## Status público

- `/status`: estado agregado real, componentes públicos e incidentes sanitizados;
- `/status/history`: histórico público resolvido;
- `/api/status`: snapshot sanitizado.

Se snapshot/probe/freshness falhar, a resposta é `Estado desconhecido`, nunca “Todos os sistemas estão operacionais”.

O formulário de inscrição só aparece quando Brevo e o segredo de assinatura estão configurados. Usa double opt-in, token de confirmação armazenado em hash, unsubscribe assinado e dedupe de entrega.

## Runbooks críticos

### Supabase Database

Sinais: probe read-only, latência, erros de conexão/RLS, dependências afetadas.

Diagnóstico: verificar erro sanitizado, logs de Postgres/API, conexões e mudanças recentes. Advisor é recomendação, não prova de causa.

Recuperação comprovada: probes consecutivos de leitura saudável, dependências recuperadas e taxa de erro normal.

### App Cliente — Agendamentos

Sinais: `/app-cliente/agendamentos`, availability, hydration, operações de cancelar/reagendar.

Diagnóstico: comparar SSR/primeiro render, API/DB subjacentes, timezone canônico e deployment.

Recuperação comprovada: rota/componente saudável, sem nova ocorrência na janela, N probes saudáveis e deployment atual confirmado.

### App Profissional — Auth

Sinais: login HTTP, presença apenas booleana de configuração server-side, erros internos separados de credencial inválida.

Nunca registrar ou exibir `PROFISSIONAL_SESSION_SECRET`.

### Agenda/Caixa

Sinais: canários de leitura, erros de ações críticas e latência. Não criar agendamento/comanda fictícia como probe.

### Asaas/Webhooks

Separar rejeição de negócio, timeout, indisponibilidade e backlog. Reprocessamento automático só é seguro para operação comprovadamente idempotente.

### Cron

`eventos_cron` registra início/fim. Job sem execução dentro de janela + tolerância vira `unknown/degraded`, não é assumido saudável.

## CI

`npm run audit:operational-coverage` compara superfícies encontradas no código com o registro e sinais reais de observabilidade. Rotas críticas mutáveis e domínios auth/pagamentos/webhooks/cron não podem depender apenas de um componente genérico `platform.api`.

`npm run test:operational` cobre fingerprint, catálogo, máquina de estados, anti-flapping, auto-resolve, reopen, agregação e timezone/hydration determinístico.

## Regra de rollout

1. lint/typecheck/testes/auditorias/build no PR;
2. aplicar migrations versionadas;
3. sincronizar registry;
4. executar probes; inicialmente componentes sem evidência ficam `unknown`;
5. reconciliar incidentes individualmente;
6. somente após evidências atualizar status para resolvido/operacional;
7. manter histórico e publicar apenas conteúdo sanitizado.
