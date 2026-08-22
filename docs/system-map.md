# Mapa Operacional do Sistema

Este documento define a arquitetura e os contratos de manutenção do SalãoPremium. Deve ser consultado antes de refatorações grandes, migrations e releases.

## Superfícies oficiais

| Superfície | Implementação |
| --- | --- |
| Site público | Next.js |
| Painel do salão | Next.js em `app/(painel)` |
| App Cliente | Next.js em `app/app-cliente` |
| **App Profissional** | **Vite PWA em `apps/app-profissional-vite`** |
| Admin Master | Next.js em `app/(admin-master)` |

Não existe mais uma segunda implementação Next do App Profissional. O bundle Vite é gerado em `public/app-profissional` e servido pela camada de proxy/host.

## Fluxo oficial da operação

1. **agendamento** cria contexto de cliente, profissional, data, horário, duração e status;
2. **comanda** representa serviços, produtos e itens consumidos;
3. **pagamento** registra forma, bruto, desconto, acréscimo, taxa e líquido;
4. **fechamento** congela a operação financeira e dispara efeitos;
5. **estoque** aplica baixa/reversão idempotente;
6. **comissão** usa a mesma base financeira oficial;
7. **log/notificação** registra o evento e comunica as audiências necessárias.

```text
Cliente/App Profissional/Painel
             │
             ▼
          Agenda
             │
             ▼
          Comanda
             │
             ▼
      Caixa / Pagamento
             │
             ▼
         Fechamento
       ┌─────┼─────┐
       ▼     ▼     ▼
    Estoque Comissão Logs/Push
```

## Contratos por domínio

### Agenda

- estado visual reflete estado persistido;
- disponibilidade é revalidada no backend antes de confirmar;
- drag/resize/edição precisam de rollback visual em erro;
- alterações que impactam comanda devem usar fluxo transacional/idempotente;
- bloquear conflito de profissional, horário e duração.

### Caixa

- UI não define regra financeira final sozinha;
- taxa precisa indicar se é repassada ou absorvida;
- abertura, fechamento, sangria, reforço e vale precisam de trilha auditável;
- fechamento repetido não pode duplicar pagamento, estoque ou comissão.

### Comandas e vendas

- comanda e venda não podem divergir para o mesmo atendimento;
- comanda fechada bloqueia edição financeira normal;
- reabertura, quando permitida, é explícita e auditada;
- totais do frontend e backend usam a mesma regra.

### Serviços

- preço, duração, agenda, comissão, profissionais permitidos e consumo são dados de negócio;
- exceção por profissional deve ter precedência documentada;
- App Cliente e App Profissional exibem o mesmo catálogo elegível do salão.

### Produtos e estoque

- produto possui custo, preço, estoque e margem;
- baixa por comanda é idempotente;
- entrada/saída/ajuste mantêm origem e responsável.

### Profissionais

- conecta agenda, comissão, App Profissional e permissões;
- sessão precisa estar limitada a `id_salao` + `id_profissional`;
- o App Profissional oficial é o Vite;
- faturamento/comissão exibidos precisam bater com o fechamento do painel.

### Clientes

- cadastro normaliza contato/identidade;
- evitar duplicidades relevantes;
- App Cliente possui identidade global própria e vínculo operacional com salões/agendamentos;
- dados pessoais exigem minimização em logs/IA.

### Assinatura, webhook e cron

- webhook externo é fonte importante de mudança comercial e precisa de idempotência;
- cron reconcilia estados sem duplicar efeito;
- checkout deve reutilizar cobrança pendente quando a regra permitir;
- status do salão e assinatura precisam ser coerentes antes de liberar recursos.

### App Cliente

- salões, notas, portfólio, preços e disponibilidade são reais;
- reserva revalida disponibilidade;
- login/recuperação usam o contexto específico do cliente;
- cabeçalhos/navegação mobile não podem esconder conteúdo crítico.

### App Profissional Vite

- fonte: `apps/app-profissional-vite`;
- autenticação via `/api/app-profissional/auth/*`;
- dados sensíveis/mutações passam por APIs/RPCs protegidas;
- cache offline nunca substitui o backend para financeiro/permissão/status;
- PWA precisa ser atualizado junto com o build principal.

### Admin Master

- ação precisa ter efeito real, guard e log;
- saúde não deve inventar estado operacional;
- mudanças destrutivas exigem confirmação e trilha de auditoria.

## Notificações

Eventos visíveis devem declarar, quando aplicável:

- evento estável;
- severidade;
- audiência;
- persistência/expiração;
- destino ao clicar;
- deduplicação/idempotência;
- canal (in-app, push, e-mail, WhatsApp).

## Multi-tenancy

`id_salao` é fronteira estrutural dos dados de negócio do salão. Qualquer consulta privilegiada precisa comprovar o salão a partir da sessão, não apenas de parâmetros do navegador.

## Banco e migrations

Migrations já aplicadas são histórico imutável. Features removidas podem deixar migrations antigas versionadas; a remoção de schema deve ocorrer por nova migration após revisão e backup.

## Critério de consistência

Uma alteração só está completa quando o mesmo conceito continua coerente entre:

- Painel;
- App Cliente;
- App Profissional Vite;
- APIs/RPCs;
- banco;
- notificações;
- documentação;
- testes/auditorias.