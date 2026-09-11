# Changelog

Todas as mudancas importantes do projeto serao documentadas aqui.

## [0.4.0] - 2026-08-18

### App Cliente

- Novo cadastro sem senha com nome completo, CPF valido, data de nascimento, WhatsApp e e-mail opcional.
- Novo login principal por CPF + data de nascimento, com rate limit por identidade derivada e IP.
- Acesso legado mantido temporariamente apenas para contas antigas concluirem a migracao sem perder acesso.
- Sessao do cliente passou a usar `auth_version` para invalidacao controlada.
- Recuperacao de acesso por codigo de 6 digitos via e-mail, sem redefinicao de senha.
- Fluxo de recuperacao por CPF + nascimento e fluxo de alteracao segura de e-mail com codigo no novo endereco.
- E-mail nao pode mais ser alterado diretamente pelo perfil sem verificacao.
- Vinculo de cliente com saloes passou a priorizar CPF e foi corrigido para permitir a mesma conta global em varios saloes.
- E-mails sinteticos `.local` foram removidos das contas globais sem excluir IDs, historico ou vinculos.
- Criados links individuais, temporarios e de uso unico para migracao de clientes antigos, sem CPF ou nascimento na URL.
- Painel ganhou a area `Clientes > Atualizar App Cliente`, com abertura do WhatsApp comum usando mensagem pronta e envio manual, sem depender de WhatsApp API.
- Clientes com e-mail real podem receber o link seguro pela infraestrutura de e-mail existente.
- Endpoints mobile foram alinhados com cadastro, login, recuperacao e alteracao de e-mail novos.
- Tabelas de OTP e tokens de migracao protegidas por RLS e sem acesso direto de `anon`/`authenticated`.
- Testes de CPF e data de nascimento adicionados ao CI.

## [0.3.0] - 2026-04-14

### Corrigido

- Auditoria de dependencias adicionada aos scripts e ao CI como checagem informativa.
- Dependabot configurado para monitorar dependencias semanalmente.
- Dependabot ajustado para nao abrir major automatico de TypeScript apos falha no typecheck.
- Helpers, tipos e componentes auxiliares separados das paginas grandes de caixa, configuracoes e vendas.
- Fluxos de feedback e helpers de comanda extraidos da pagina de agenda.
- Logica de comissao alinhada entre agenda, caixa e comanda manual, com guias praticos para configuracao em servicos, comissoes, profissionais e taxas, incluindo desconto da taxa do profissional tambem para base bruta.
- Caixa refatorado com modal de cancelamento e modal de item extraidos, hook proprio para busca e selecao de itens e helper dedicado para montar payload de itens da comanda.
- Caixa conectado a camada `lib/caixa`, com loaders reutilizaveis para acesso, listas, catalogos, configuracoes e detalhe da comanda, reduzindo ainda mais a pagina principal.
- Caixa ganhou uma rodada visual premium com header de KPIs, fila em cards operacionais, detalhe agrupado por tipo, resumo financeiro mais claro e previsao explicita do impacto da taxa nos pagamentos.
- Agenda ganhou uma rodada de polimento premium com header operacional, KPIs do periodo, barra de profissionais mais forte, cards de atendimento com mais contexto e realce do horario atual no grid.
- Agenda recebeu ajuste fino para priorizar o grid, com topo mais compacto e melhor aproveitamento vertical da tela.
- Comissoes ganhou um painel mais visual, com header financeiro, cards por profissional, leitura mais clara de origem da regra e tabela analitica mais facil de conferir.
- Validacao de segredos reforcada em webhook Asaas e cron de renovacao.
- Remocao de helper legado de sessao do profissional via `localStorage`.
- Correcoes de typecheck, lint e build.
- Protecao server-side para APIs administrativas de usuarios.
- Protecao da rota de debug em producao.
- Ajuste de navegacao da landing page.
- Remocao de arquivos locais e gerados do rastreamento do Git.
- Checklist inicial de producao.

## [0.2.0] - Em breve

### Planejado

- Melhorias no sistema de permissoes.
- Refatoracao de arquivos grandes.
- Releases no GitHub.
- Mais documentacao tecnica.

## [0.1.0] - 2026-04-08

### Adicionado

- Estrutura inicial do painel.
- Login com Supabase.
- Dashboard inicial.
- Agenda inicial.
- Modulo de caixa.
- Modulo de configuracoes.
- Gestao de usuarios por plano.
- Controle de permissoes por nivel.
