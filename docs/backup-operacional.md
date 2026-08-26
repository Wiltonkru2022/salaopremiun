# Backup Operacional

Backups devem permitir recuperar código, schema e — quando explicitamente autorizado — dados. O App Profissional oficial está em `apps/app-profissional-vite`; `public/app-profissional` é artefato gerado e pode ser reconstruído pelo build.

## Código

```bash
npm run backup:local
```

O script cria um bundle em `backups/`. A pasta é local e não deve ser versionada.

Antes de mudança destrutiva importante, confirme que o bundle abre e contém o commit esperado.

## Banco sem dados sensíveis

```bash
npm run backup:db:schema
```

Requisitos usuais:

- Neon CLI autenticada/linkada;
- ambiente necessário para o dump;
- acesso ao projeto correto.

O dump de schema vai para `backups/database/`.

## Banco com dados

Somente quando realmente necessário:

```bash
ALLOW_DB_DATA_BACKUP=1 npm run backup:db:data
```

PowerShell:

```powershell
$env:ALLOW_DB_DATA_BACKUP='1'
npm run backup:db:data
```

Esse arquivo pode conter PII, CPF, contatos e dados financeiros. Armazene criptografado, restrinja acesso e defina retenção.

## Backup seguro padrão

```bash
npm run backup:all:safe
```

Cria backup do código e tenta gerar o dump do schema sem exportar dados pessoais.

## Antes de migrations destrutivas

- criar backup de código;
- criar backup de schema;
- se houver risco de perda de dados, criar backup de dados com autorização;
- verificar ambiente/projeto Neon;
- documentar rollback/correção;
- nunca apagar migration histórica já aplicada.

### Feature removida: editor de imagens

A migration histórica `20260519210000_editor_ecossistema.sql` continua versionada. Se tabelas/bucket do editor forem removidos do banco, isso deve ocorrer em **nova migration**, depois de backup e validação de que não há conteúdo necessário.

## Restore

Backup só é confiável quando existe procedimento de restore testado. Sempre que possível, valide restauração em ambiente separado antes de depender do backup em produção.