# App Cliente

## Fonte oficial

O App Cliente faz parte do projeto Next.js e vive principalmente em:

- `app/app-cliente` — páginas, Server Actions e fluxos;
- `components/client-app` — UI e runtimes do cliente;
- `app/services/cliente-app` — serviços server-side;
- `lib/client-app` e `lib/client-context.server.ts` — consultas, contexto e regras compartilhadas;
- `app/api/mobile/cliente` e APIs específicas — operações HTTP quando necessárias.

## Objetivo

Entregar ao cliente final uma experiência mobile/PWA para descobrir salões, consultar serviços/profissionais, reservar horários e acompanhar seus atendimentos sem expor regras administrativas do salão.

## Fluxo principal de reserva

```text
Explorar salões
    ↓
Perfil do salão
    ↓
Profissional
    ↓
Serviço(s)
    ↓
Data e horário disponível
    ↓
Resumo / confirmação
    ↓
Agendamento persistido
```

A disponibilidade exibida precisa vir de regra real de agenda. A UI nunca deve criar horário fictício ou assumir disponibilidade sem confirmação do backend.

## Identidade e acesso

Fluxo atual:

- cadastro: nome completo, data de nascimento, CPF válido, WhatsApp e e-mail opcional;
- login: CPF + data de nascimento;
- recuperação por e-mail quando disponível;
- recuperação por CPF + nascimento com confirmação de e-mail;
- alteração de e-mail após validação de identidade e código.

A sessão do App Cliente é separada da experiência de login administrativo do painel.

## Perfil do salão

O perfil público deve usar somente dados reais do salão:

- capa/logo;
- selo Premium somente quando aplicável;
- nota e quantidade real de avaliações;
- endereço e distância quando disponíveis;
- horário de funcionamento;
- próximo horário real;
- WhatsApp, telefone e Instagram cadastrados;
- serviços e preços reais;
- profissionais elegíveis;
- portfólio real;
- avaliações reais.

Não fabricar nota, quantidade de avaliações, disponibilidade, distância ou preços.

## Cabeçalhos e navegação mobile

A UI segue cabeçalhos fixos nas superfícies em que o usuário precisa manter contexto/navegação. No perfil do salão a barra superior deve ser neutra e independente da foto de capa, preservando ações como voltar, favoritar, compartilhar e menu sem depender do contraste da imagem.

Telas de autenticação usam um shell próprio, limpo, com identificação do SalãoPremium e rodapé institucional.

## Segurança

- consultas e mutações devem respeitar a identidade do cliente e o salão relacionado;
- o frontend nunca recebe Service Role;
- ações de agendamento precisam validar disponibilidade novamente no servidor;
- cancelamento/reagendamento devem validar regras/status antes de alterar dados;
- dados pessoais não devem entrar em telemetria sem necessidade;
- CPF e data de nascimento exigem tratamento cuidadoso em logs, mensagens de erro e suporte.

## PWA e push

O App Cliente participa do fluxo Web Push. A subscription é persistida com audiência/dispositivo e usada para eventos de agenda relevantes. Em iOS, push web exige instalação na tela inicial e permissão do usuário.

## Testes recomendados

```bash
npm run e2e:client-login-booking
npm run e2e:client-resilience
npm run e2e:client-professional
npm run typecheck
```

Também validar manualmente:

- cadastro;
- login;
- recuperação de acesso;
- reserva completa;
- retorno ao topo ao trocar etapa;
- ausência de horários ocupados;
- reagendamento/cancelamento;
- favoritos e compartilhamento;
- push com PWA fechado.