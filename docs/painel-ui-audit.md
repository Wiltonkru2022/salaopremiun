# Auditoria UI/UX do Painel - referencia App Profissional

Data: 2026-08-22

## Objetivo

Este documento registra a analise completa do painel do salao usando o App Profissional Vite como referencia de padrao visual, interacao e velocidade percebida.

Pedido original: padronizar UI, layout, cores, organizacao, loading, navegacao sem recarregar pagina e experiencia saudavel para recepcao.

## Escopo analisado

- Painel Next.js: `app/(painel)`
- Layout principal: `components/layout`
- Componentes operacionais: `components/agenda`, `components/caixa`, `components/ui`
- Base visual global: `app/globals.css`
- Tokens locais: `lib/design-tokens`
- App Profissional oficial: `apps/app-profissional-vite`

Inventario rapido:

- `app/(painel)`: 55 arquivos.
- `apps/app-profissional-vite/src`: 36 arquivos.
- Componentes compartilhados relevantes do painel: mais de 180 arquivos em `components`.

## Diagnostico direto

O painel tem boa cobertura funcional, mas a experiencia visual esta fragmentada. O problema principal nao e uma unica tela ruim: e a falta de um padrao unico para todo o painel.

Hoje existem quatro problemas grandes:

1. Loading de tela inteira muito pesado e visualmente fraco.
2. Algumas navegacoes internas ainda usam `window.location.assign`, `<a href>` ou `router.refresh`, o que pode causar recarregamento real ou sensacao de recarregamento.
3. Muitas paginas grandes misturam carregamento, regra de negocio, formularios, layout e estado local no mesmo arquivo.
4. Cores, cards, botoes, modais, filtros e estados nao seguem um sistema unico igual ao App Profissional.

## Referencia visual do App Profissional

Fonte oficial: `apps/app-profissional-vite`.

Padroes bons encontrados:

- Shell compacto, mobile-first e direto ao trabalho.
- Navegacao por estado local, sem troca de rota para cada tela interna.
- Fundo claro, superficies brancas e texto zinc/preto.
- Acento principal em amber/dourado, com uso controlado.
- Cards simples com borda zinc clara, sombra leve e espacamento consistente.
- Botoes padronizados por variante.
- Inputs com label pequeno, altura estavel e foco bem definido.
- Modal com cabecalho e rodape fixos, facil de usar em fluxo operacional.
- Busca e selecao com criacao inline, sem tirar o usuario da tarefa.
- Mudancas de dia, profissional, filtros e acoes mantem contexto em tela.

Arquivos de referencia:

- `apps/app-profissional-vite/src/components/layout/AppShell.tsx`
- `apps/app-profissional-vite/src/components/ui/Button.tsx`
- `apps/app-profissional-vite/src/components/ui/Card.tsx`
- `apps/app-profissional-vite/src/components/ui/Input.tsx`
- `apps/app-profissional-vite/src/components/ui/Modal.tsx`
- `apps/app-profissional-vite/src/components/ui/SearchPicker.tsx`
- `apps/app-profissional-vite/src/pages/AgendaPage.tsx`
- `apps/app-profissional-vite/src/pages/ClientesPage.tsx`
- `apps/app-profissional-vite/src/pages/ComandasPage.tsx`
- `apps/app-profissional-vite/src/pages/InicioPage.tsx`

Observacao importante: o painel e desktop/recepcao, entao nao deve copiar tamanhos mobile 1:1. Deve copiar a linguagem visual, os estados e a fluidez, mas adaptar para uma interface mais densa e rapida para uso repetido.

## Padrao recomendado para o painel

Criar um unico sistema visual para todo o painel:

- Fundo geral: claro, neutro e limpo.
- Superficies: branco, borda zinc clara, sombra baixa.
- Texto primario: zinc/preto.
- Texto secundario: zinc medio.
- Acento principal: amber/dourado do produto.
- Estados: verde para sucesso, vermelho para risco, azul para informacao, amber para atencao.
- Botoes: altura estavel, icone quando fizer sentido, variantes fixas.
- Filtros: sempre na mesma posicao, com mesmos tamanhos.
- Tabelas/listas: densas, legiveis e sem cards dentro de cards.
- Modais: cabecalho fixo, corpo rolavel, rodape fixo, acoes claras.
- Empty states: discretos, com uma acao principal.
- Loading: skeleton do conteudo, nunca tela inteira chamativa quando o shell ja carregou.

## Problema do loading

Arquivo central:

- `components/ui/AppLoading.tsx`

Usos encontrados em rotas do painel:

- `app/(painel)/loading.tsx`
- `app/(painel)/agenda/loading.tsx`
- `app/(painel)/assinatura/page.tsx`
- `app/(painel)/agenda/page.tsx`
- `app/(painel)/caixa/page.tsx`
- `app/(painel)/clientes/page.tsx`
- `app/(painel)/comandas/page.tsx`
- `app/(painel)/comissoes/page.tsx`
- `app/(painel)/dashboard/page.tsx`
- `app/(painel)/estoque/page.tsx`
- `app/(painel)/perfil-salao/page.tsx`
- `app/(painel)/produtos/page.tsx`
- `app/(painel)/profissionais/page.tsx`
- `app/(painel)/relatorio-financeiro/page.tsx`
- `app/(painel)/servicos/page.tsx`
- `app/(painel)/servicos-extras/page.tsx`
- `app/(painel)/vendas/page.tsx`
- `components/configuracoes/ConfiguracoesPageClient.tsx`

Diagnostico:

- O loading atual vira a tela principal em vez de ser um estado discreto.
- A animacao e a caixa central nao combinam com o App Profissional.
- Em telas operacionais, principalmente agenda e caixa, trocar tudo por loading quebra o ritmo da recepcao.

Solucao recomendada:

- Descontinuar `AppLoading` para painel.
- Criar componentes:
  - `PainelPageSkeleton`
  - `PainelTableSkeleton`
  - `PainelAgendaSkeleton`
  - `PainelDashboardSkeleton`
  - `PainelInlineBusy`
- Manter shell, header e filtros visiveis durante carregamento.
- Em troca de dia/horario/profissional, manter os dados antigos em tela e mostrar apenas um estado discreto no bloco afetado.
- Usar `loading.tsx` somente como skeleton estrutural do route group.

## Problema de recarregamento e navegacao

Pontos criticos encontrados:

- `components/layout/Header.tsx`
  - Busca usa `window.location.assign`.
  - Menu da conta usa `<a href>` para rotas internas.
  - Links de plano/assinatura usam `<a href>`.

- `components/layout/Sidebar.tsx`
  - Aviso de assinatura usa `window.location.assign`.
  - Agenda e caixa abrem em modo workspace/nova janela por configuracao de menu.

- `components/layout/AppShell.tsx`
  - Logout usa `router.push` e depois `router.refresh`.

- `app/(painel)/perfil-salao/page.tsx`
  - Varias chamadas de `router.refresh`.
  - Uma chamada de `window.location.assign` para fluxo externo de OAuth.

- `app/(painel)/agenda/page.tsx`
  - Usa redirecionamento para fluxo externo quando necessario.
  - Usa janela/workspace para abrir caixa.

- `components/agenda/useAgendaData.ts`
  - Tem tratamento para href externo com `window.location.assign`, mas interno usa `router.replace`.

- Rotas de campanhas usam varios formularios com Server Actions:
  - `app/(painel)/campanhas/page.tsx`
  - `app/(painel)/campanhas/[id]/page.tsx`
  - `app/(painel)/campanhas/nova/page.tsx`
  - `app/(painel)/configuracoes/notificacoes/page.tsx`

Regra para corrigir:

- Link interno deve usar `next/link`.
- Acao interna deve usar `router.push`, `router.replace` ou estado local.
- `window.location.assign` deve ficar apenas para URL externa real.
- `router.refresh` deve ser raro e justificado.
- Alterar dia, horario, filtro, busca ou aba nao deve recarregar documento.
- Formularios que precisam parecer instantaneos devem usar estado otimista, `useActionState` ou API client-side com atualizacao local.

## Arquivos de maior risco por tamanho

Estes arquivos concentram muita responsabilidade e devem ser refatorados com cuidado:

| Arquivo | Linhas aproximadas | Risco principal |
| --- | ---: | --- |
| `app/(painel)/perfil-salao/page.tsx` | 3229 | Muitas secoes, muitos refreshes, grande risco visual e de estado |
| `app/(painel)/relatorio-financeiro/page.tsx` | 2511 | Dados, filtros, graficos e layout no mesmo arquivo |
| `components/configuracoes/ConfiguracoesPageClient.tsx` | 2189 | Configuracoes demais em um unico client component |
| `app/(painel)/agenda/page.tsx` | 1801 | Tela critica de recepcao, muito estado e UX sensivel |
| `app/(painel)/vendas/page.tsx` | 1684 | Filtros e listagem financeira pesados |
| `app/(painel)/comissoes/page.tsx` | 1665 | Relatorio operacional grande |
| `components/profissionais/ProfissionalForm.tsx` | 1393 | Formulario extenso |
| `components/agenda/useAgendaMutations.ts` | 960 | Mutacoes importantes de agenda |
| `components/agenda/useAgendaModal.ts` | 950 | Estado de modal complexo |
| `components/caixa/useCaixaOperations.ts` | 937 | Operacoes financeiras sensiveis |
| `components/clientes/ClienteForm.tsx` | 914 | Formulario grande e reutilizavel |
| `components/agenda/AgendaGrid.tsx` | 761 | Principal superficie operacional |

## Analise por area

### Shell do painel

Arquivos:

- `app/(painel)/layout.tsx`
- `components/layout/AppShell.tsx`
- `components/layout/Header.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/navigation.tsx`

Problemas:

- Shell e menu ja existem, mas a linguagem visual nao segue 100% o App Profissional.
- Header tem busca, plano, conta e menus com estilos e navegacao misturados.
- Alguns links internos ainda podem recarregar a pagina.
- Agenda e caixa sao tratados como tela cheia/workspace, mas isso precisa ser uma decisao de produto clara para recepcao.

Implementacao recomendada:

- Criar shell padrao do painel com header mais compacto.
- Converter links internos do Header para `Link`.
- Trocar `window.location.assign` interno por `router.push`.
- Padronizar estados ativos do menu com amber/zinc.
- Manter agenda e caixa como superficies operacionais rapidas; se abrirem em workspace, o workspace tambem precisa usar o mesmo padrao visual.

### Loading e transicoes

Arquivos:

- `components/ui/AppLoading.tsx`
- `app/(painel)/loading.tsx`
- `app/(painel)/agenda/loading.tsx`

Problemas:

- Loading central chama atencao demais.
- Nao parece produto profissional.
- Pode aparecer em momentos que deveriam preservar contexto.

Implementacao recomendada:

- Substituir por skeletons.
- Usar pequenas barras/linhas de carregamento dentro da area afetada.
- Nunca esconder a agenda inteira ao trocar data quando ja existe agenda carregada.

### Componentes UI comuns

Arquivos:

- `components/ui/AppModal.tsx`
- `components/ui/ConfirmActionModal.tsx`
- `components/ui/SearchableSelect.tsx`
- `components/ui/PaginationControls.tsx`
- `components/ui/PendingActionButton.tsx`

Problemas:

- Modais, confirmacoes, select pesquisavel e paginacao nao seguem uma linguagem unica.
- `PaginationControls` deve ficar mais previsivel: voltar, paginas, avancar.
- Confirmacoes precisam parecer iguais em todo painel.

Implementacao recomendada:

- Criar uma camada `components/painel-ui` com:
  - `PainelButton`
  - `PainelCard`
  - `PainelInput`
  - `PainelSelect`
  - `PainelModal`
  - `PainelPageHeader`
  - `PainelToolbar`
  - `PainelEmptyState`
  - `PainelTable`
  - `PainelSkeleton`
- Migrar paginas aos poucos para esses componentes.
- Evitar cards dentro de cards.

### Agenda

Arquivos:

- `app/(painel)/agenda/page.tsx`
- `components/agenda/AgendaGrid.tsx`
- `components/agenda/AgendaToolbar.tsx`
- `components/agenda/AgendaModal.tsx`
- `components/agenda/useAgendaData.ts`
- `components/agenda/useAgendaMutations.ts`
- `components/agenda/useAgendaModal.ts`

O que ja esta bom:

- Alteracao de dia e profissional trabalha majoritariamente com estado local.
- A tela ja e client-side e pode ser muito rapida quando o carregamento visual for corrigido.
- Atualizacao periodica quando a aba esta visivel e util para recepcao.

Problemas:

- O arquivo principal esta grande.
- Usa `AppLoading` no carregamento inicial.
- Toolbar usa violet em alguns estados, diferente do App Profissional.
- Modal e grid precisam do mesmo padrao visual dos outros fluxos.

Implementacao recomendada:

- Trocar violet por tokens amber/zinc.
- Manter agenda visivel durante troca de filtros.
- Criar skeleton especifico da grade.
- Separar cabecalho, metricas, filtros e corpo.
- Garantir que clicar em horario, dia ou profissional nao gere navegacao de documento.

### Caixa

Arquivos:

- `app/(painel)/caixa/page.tsx`
- `components/caixa/useCaixaData.ts`
- `components/caixa/useCaixaOperations.ts`
- `components/caixa/CashDrawerView.tsx`

Problemas:

- Caixa e tela critica para recepcao e nao pode sumir com loading de tela inteira.
- Visual precisa ser mais denso, com totais e acoes sempre claros.
- Operacoes financeiras precisam feedback local imediato.

Implementacao recomendada:

- Criar layout operacional fixo: resumo, comandas/pagamentos, acoes.
- Usar skeleton somente em listas/totais.
- Mostrar estado de processamento por botao/linha, nao na pagina toda.
- Padronizar confirmacoes financeiras com `PainelModal`.

### Dashboard

Arquivo:

- `app/(painel)/dashboard/page.tsx`

Problemas:

- Client page grande para dashboard.
- Usa `AppLoading` inicial.
- Busca dados via API no cliente.
- Cards e metricas precisam padrao unico.

Implementacao recomendada:

- Carregar snapshot inicial no servidor quando possivel.
- Hidratar componente cliente com `initialData`.
- Trocar loading por skeleton de metricas.
- Padronizar cards de metrica, atalhos e alertas.

### Clientes

Arquivos:

- `app/(painel)/clientes/page.tsx`
- `components/clientes/ClienteForm.tsx`

Problemas:

- Usa Supabase client e loading inicial forte.
- Lista, busca, filtros e formulario ainda nao compartilham o mesmo padrao dos outros cadastros.
- Formulario e grande.

Implementacao recomendada:

- Criar padrao unico de pagina de cadastro/lista.
- Reaproveitar busca estilo `SearchPicker`.
- Dividir formulario por secoes.
- Manter lista visivel ao cadastrar/editar.

### Profissionais

Arquivos:

- `app/(painel)/profissionais/page.tsx`
- `components/profissionais/ProfissionalForm.tsx`

Problemas:

- Formulario grande e sensivel.
- Precisa padrao identico de botoes, campos, permissao e feedback.

Implementacao recomendada:

- Dividir dados basicos, horarios, permissoes e servicos.
- Usar componentes `PainelField`, `PainelSection`, `PainelModal`.
- Evitar refresh global apos salvar; atualizar linha/card local.

### Servicos e servicos extras

Arquivos:

- `app/(painel)/servicos/page.tsx`
- `app/(painel)/servicos-extras/page.tsx`
- `components/servicos/ServicoForm.tsx`
- `components/servicos/ComboServicoForm.tsx`

Problemas:

- Varias listas e formularios com estados parecidos mas UI nao unificada.
- Muitos links e acoes precisam ser revisados para navegacao suave.

Implementacao recomendada:

- Unificar pagina de catalogo.
- Usar tabela/lista responsiva padrao.
- Criar modal unico de servico/combo/extra.

### Produtos e estoque

Arquivos:

- `app/(painel)/produtos/page.tsx`
- `app/(painel)/estoque/page.tsx`

Problemas:

- Fluxos conectados, mas a UI pode parecer telas diferentes.
- Precisa destaque operacional para estoque baixo, reposicao e historico.

Implementacao recomendada:

- Criar padrao de inventario.
- Usar badge/status unico.
- Atualizacoes de quantidade devem ser inline, sem refresh de pagina.

### Comandas e vendas

Arquivos:

- `app/(painel)/comandas/page.tsx`
- `app/(painel)/vendas/page.tsx`
- `components/comandas/ComandaForm.tsx`

Problemas:

- Vendas e comandas sao centrais para recepcao.
- Filtros e status precisam ser iguais entre telas.
- Formularios grandes e acoes financeiras precisam feedback por linha.

Implementacao recomendada:

- Padronizar status de comanda e venda.
- Criar `PainelStatusBadge`.
- Criar toolbar comum para periodo, busca, status e profissional.
- Evitar reload apos fechar/cancelar; atualizar colecao local.

### Comissoes e relatorio financeiro

Arquivos:

- `app/(painel)/comissoes/page.tsx`
- `app/(painel)/relatorio-financeiro/page.tsx`

Problemas:

- Arquivos muito grandes.
- Muitos dados financeiros, filtros e apresentacao juntos.
- O loading atual quebra a analise da recepcao/gestao.

Implementacao recomendada:

- Separar filtros, KPIs, tabelas e exportacoes.
- Criar skeleton de relatorio.
- Manter resultados antigos visiveis enquanto novo periodo carrega.
- Padronizar cores financeiras: positivo verde, negativo vermelho, neutro zinc, alerta amber.

### Perfil do salao

Arquivo:

- `app/(painel)/perfil-salao/page.tsx`

Problemas:

- Maior arquivo do painel.
- Varias chamadas de `router.refresh`.
- Varias secoes diferentes com estilos misturados.
- Alto risco de regressao se mexer tudo de uma vez.

Implementacao recomendada:

- Quebrar em abas/secoes:
  - dados publicos;
  - horarios;
  - imagens;
  - endereco;
  - links;
  - integracoes;
  - visual do perfil.
- Atualizar estado local apos salvar.
- Usar refresh apenas quando alterar dado que realmente muda shell/permissao.

### Configuracoes

Arquivos:

- `app/(painel)/configuracoes/page.tsx`
- `components/configuracoes/ConfiguracoesPageClient.tsx`
- `app/(painel)/configuracoes/notificacoes/page.tsx`

Problemas:

- Client component muito grande.
- Secoes diferentes parecem produtos diferentes.
- Formularios com Server Action podem dar sensacao de recarregamento.

Implementacao recomendada:

- Dividir por abas de configuracao.
- Formularios com feedback inline.
- Migrar notificacoes para experiencia sem reload quando necessario.
- Criar layout unico de settings.

### Campanhas

Arquivos:

- `app/(painel)/campanhas/page.tsx`
- `app/(painel)/campanhas/[id]/page.tsx`
- `app/(painel)/campanhas/nova/page.tsx`

Problemas:

- Muitas Server Actions/formularios.
- Visual precisa entrar no mesmo padrao de listas e detalhe.
- Acoes podem gerar pending/revalidacao de pagina.

Implementacao recomendada:

- Lista padrao com filtros e status.
- Edicao em layout de detalhe com secoes.
- Usar estados locais/otimistas para acoes comuns.

### Assinatura, plano e avisos

Arquivos:

- `app/(painel)/assinatura/page.tsx`
- `app/(painel)/meu-plano/page.tsx`
- `app/(painel)/comparar-planos/page.tsx`
- `components/layout/Header.tsx`
- `components/layout/Sidebar.tsx`

Problemas:

- Links de plano aparecem em header/sidebar com navegacao nao padronizada.
- Avisos devem ser discretos e claros, sem travar operacao da recepcao.

Implementacao recomendada:

- Transformar tudo em `Link` interno.
- Padronizar banner de plano/assinatura.
- Evitar que alerta de assinatura pareca erro geral.

## Roteiro de implementacao recomendado

### Fase 1 - Fundacao visual

Arquivos principais:

- `app/globals.css`
- `lib/design-tokens/index.ts`
- novo: `components/painel-ui/*`
- `components/ui/AppLoading.tsx`

Entrega:

- Tokens finais de cor, borda, raio, sombra e espacamento.
- Componentes base do painel.
- Skeletons novos.
- `AppLoading` removido das telas do painel ou transformado em fallback discreto.

### Fase 2 - Shell e navegacao sem reload

Arquivos:

- `components/layout/AppShell.tsx`
- `components/layout/Header.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/navigation.tsx`
- `app/(painel)/layout.tsx`

Entrega:

- Header e sidebar no novo padrao.
- Links internos via `Link`.
- Sem `window.location.assign` para rotas internas.
- `router.refresh` revisado.
- Navegacao mais rapida e previsivel.

### Fase 3 - Recepcao primeiro: agenda e caixa

Arquivos:

- `app/(painel)/agenda/page.tsx`
- `components/agenda/*`
- `app/(painel)/caixa/page.tsx`
- `components/caixa/*`

Entrega:

- Agenda e caixa sem loading de tela inteira durante uso.
- Troca de dia/horario/profissional sem recarregar.
- Estados inline.
- Visual padronizado para uso diario de recepcao.

### Fase 4 - Cadastros e operacao diaria

Arquivos:

- `app/(painel)/dashboard/page.tsx`
- `app/(painel)/clientes/page.tsx`
- `app/(painel)/profissionais/page.tsx`
- `app/(painel)/servicos/page.tsx`
- `app/(painel)/servicos-extras/page.tsx`
- `app/(painel)/produtos/page.tsx`
- `app/(painel)/estoque/page.tsx`
- `app/(painel)/comandas/page.tsx`
- `app/(painel)/vendas/page.tsx`

Entrega:

- Padrao unico de pagina de lista.
- Toolbar unica de filtros/busca.
- Modais e formularios consistentes.
- Atualizacoes locais sem refresh visual pesado.

### Fase 5 - Configuracoes, perfil e financeiro

Arquivos:

- `app/(painel)/perfil-salao/page.tsx`
- `components/configuracoes/ConfiguracoesPageClient.tsx`
- `app/(painel)/configuracoes/*`
- `app/(painel)/comissoes/page.tsx`
- `app/(painel)/relatorio-financeiro/page.tsx`

Entrega:

- Arquivos grandes divididos em componentes menores.
- Perfil e configuracoes com navegacao por secoes.
- Relatorios com filtros estaveis e skeletons.
- Menos `router.refresh`.

### Fase 6 - Campanhas, assinatura e acabamento

Arquivos:

- `app/(painel)/campanhas/*`
- `app/(painel)/assinatura/page.tsx`
- `app/(painel)/meu-plano/page.tsx`
- `app/(painel)/comparar-planos/page.tsx`

Entrega:

- Fluxos comerciais no mesmo padrao visual.
- Server Actions revisadas para reduzir sensacao de reload.
- Banners, planos e avisos consistentes.

## Criterios de aceite

Antes de considerar a atualizacao pronta:

- Header, sidebar, cards, botoes, inputs, modais, tabelas e loading seguem um padrao unico.
- Nenhum link interno principal usa `window.location.assign`.
- Links internos do Header e Sidebar usam `Link` ou router client-side.
- Alterar dia/horario/profissional na agenda nao recarrega o documento.
- Alterar filtros em vendas, relatorios, clientes e comandas nao apaga a tela inteira.
- Agenda e caixa continuam utilizaveis enquanto dados atualizam.
- Nenhum texto estoura em botoes/cards nos tamanhos principais.
- Fluxo de recepcao foi testado em desktop 1366x768 e 1440x900.
- Fluxo basico mobile/tablet foi validado para responsividade.
- Console do navegador sem erros.
- Build e typecheck passam.

## Testes recomendados

Automatizados:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Teste Playwright para navegacao painel sem reload completo.
- Teste Playwright para agenda: trocar dia, abrir horario, criar/editar agendamento.
- Teste Playwright para caixa: abrir comanda, registrar pagamento, fechar.

Manuais:

1. Login no painel.
2. Entrar no dashboard.
3. Abrir agenda.
4. Trocar dia, semana, profissional e horario.
5. Criar ou editar agendamento.
6. Abrir caixa a partir da agenda.
7. Fechar pagamento.
8. Voltar para comandas/vendas.
9. Abrir clientes e editar cadastro.
10. Abrir perfil do salao e salvar uma secao.
11. Conferir que o navegador nao faz refresh completo em acoes internas comuns.

## Conclusao

A atualizacao e grande, mas tem caminho claro. O painel deve ser tratado como um produto operacional de recepcao: rapido, denso, previsivel e com contexto sempre visivel.

O App Profissional deve guiar linguagem, cores, estados e fluidez. O painel deve adaptar essa linguagem para desktop, com menos visual mobile grande e mais ergonomia para quem usa o sistema o dia inteiro.

Prioridade recomendada:

1. Fundacao visual e loading.
2. Shell e navegacao.
3. Agenda e caixa.
4. Cadastros e operacao diaria.
5. Perfil, configuracoes e financeiro.
6. Campanhas, assinatura e acabamento.

## Progresso implementado em 2026-08-22

Primeira leva aplicada:

- Criada a base `components/painel-ui` com primitives de painel, headers, toolbar, badges, empty state, busy state e skeletons.
- `AppLoading` foi redesenhado para virar um skeleton discreto e alinhado ao painel, sem animacao chamativa de tela cheia.
- Nenhuma pagina em `app/(painel)` usa mais `AppLoading` diretamente.
- `app/(painel)/loading.tsx` e `app/(painel)/agenda/loading.tsx` foram trocados por skeletons estruturais.
- Dashboard, agenda, assinatura, caixa, clientes, comandas, comissoes, estoque, perfil do salao, produtos, profissionais, relatorio financeiro, servicos, servicos extras e vendas agora usam `PainelListLoading` ou skeleton especifico no carregamento inicial.
- Header, menu da conta, atalho de plano, sidebar e fallbacks de erro passaram a usar `Link`/`router` para navegacao interna.
- Logout do painel saiu de `router.push` + `router.refresh` para `router.replace`.
- `NotificationBell` foi reformatado e passou a usar `Link` para notificacoes internas, mantendo workspace windows quando necessario.
- Agenda teve os pontos visuais principais migrados de violet/roxo para amber/zinc: toolbar, grade, hoje, linha de horario atual, profissional ativo, cards e modal de status.

Segunda leva aplicada:

- Campanhas saiu do visual de landing/hero escuro e entrou no padrao operacional do painel com `PainelPageHeader`.
- Pausar/ativar campanha agora usa action client-side e atualiza o botao/selo na hora, sem redirect e sem refresh completo da pagina.
- O painel nao tem mais `router.refresh()` nas rotas de `app/(painel)` nem no shell principal.
- A varredura de roxo/violet/fuchsia no painel principal ficou limpa; os pontos residuais em agenda, vendas, comissoes, servicos, assinatura, profissionais, relatorio financeiro, meu plano e header foram migrados para amber/zinc.
- O `diff --check` voltou a passar depois da limpeza de whitespace.
- Os `window.location.assign` restantes foram mantidos apenas para URLs externas/OAuth/workspace seguro, nao para navegacao interna comum.

Terceira leva aplicada:

- Criado `PainelLinkButton` em `components/painel-ui` para padronizar CTAs internos do painel.
- Clientes, profissionais, servicos, servicos extras, produtos, estoque, comandas e vendas passaram a usar `PainelPageHeader`.
- Dashboard saiu do topo tipo hero/decorativo e passou a usar `PainelPageHeader` + toolbar operacional de periodo.
- Configuracoes saiu do topo escuro e passou a usar `PainelPageHeader` com metricas compactas.
- Campanhas nova e relatorio de campanha tambem sairam do topo escuro; o detalhe da campanha usa o toggle inline sem redirect para pausar/ativar.
- O raio global do painel em `.painel-density` foi reduzido para `8px` e passou a normalizar `rounded-2xl`, `rounded-3xl`, `20px`, `22px`, `24px`, `26px`, `28px`, `30px`, `1.75rem` e `2rem`.
- Gradientes decorativos de comissoes, vendas, meu plano e comparar planos foram simplificados para superficies neutras.

Quarta leva aplicada:

- Formularios grandes de cliente, profissional, produto, servico, extra, combo, comanda e movimentacao de estoque foram alinhados ao `PainelPageHeader`, `PainelListLoading` e raio `8px`.
- `components/configuracoes/ConfiguracoesPageClient.tsx` deixou de usar `AppLoading` e passou a usar loading discreto do painel.
- `app/(painel)/marketing/page.tsx` saiu do hero escuro e entrou no padrao operacional com cabecalho de painel, avisos amber e cards neutros.
- `app/(painel)/novidades/page.tsx` saiu do bloco dividido escuro e virou roadmap operacional com cabecalho padrao, metricas compactas e destaque amber.
- `app/(painel)/meu-plano/page.tsx` e `app/(painel)/comparar-planos/page.tsx` foram padronizados para remover topo escuro de landing page e manter a experiencia de painel.
- O destaque comercial de planos deixou de usar card preto grande e passou para amber/zinc.
- As classes residuais `bg-slate-950` no Caixa foram migradas para `bg-zinc-950`, mantendo botoes primarios consistentes.
- A classe `.painel-density` agora neutraliza letter-spacing dentro do painel para evitar textos compactos com tracking negativo herdado.
- Nova varredura confirmou: nenhum uso de `AppLoading` em `app/(painel)` ou componentes operacionais, nenhum `router.refresh()`/`location.reload`, nenhum roxo/violet/fuchsia e nenhum bloco escuro grande rastreado.

Validacoes executadas:

- `npm run lint -- --quiet`: passou.
- `npm run typecheck`: passou.
- `git diff --check`: passou.
- `SKIP_PROFESSIONAL_BUILD=1 npm run build`: passou para o build Next/painel.

Validacao da quarta leva:

- Build nao foi executado nesta etapa final porque o pedido foi finalizar a meta sem build.
- `npm run lint -- --quiet`: passou.
- `npm run typecheck`: passou.
- `git diff --check`: passou.

Observacao de build:

- `npm run build` completo sem override local parou antes da compilacao porque o processo atual nao tinha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` disponiveis para o build do App Profissional Vite.
- Como esta leva mexeu no painel Next, o build foi reexecutado com `SKIP_PROFESSIONAL_BUILD=1` e passou.
