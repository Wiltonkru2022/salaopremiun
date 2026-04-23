# Backup operacional

## Codigo
- Rode `npm run backup:local`.
- O arquivo `.bundle` sera criado em `backups/`.
- A pasta `backups/` fica fora do Git.

## Banco sem dados sensiveis
- Rode `npm run backup:db:schema`.
- Requer Supabase CLI logada/linkada e Docker Desktop ativo.
- O dump do schema sera criado em `backups/database/`.

## Banco com dados
- Rode `ALLOW_DB_DATA_BACKUP=1 npm run backup:db:data`.
- No PowerShell: `$env:ALLOW_DB_DATA_BACKUP='1'; npm run backup:db:data`.
- Esse arquivo pode conter PII e dados financeiros. Armazene em local criptografado.

## Backup seguro padrao
- Rode `npm run backup:all:safe`.
- Esse comando cria backup do codigo e tenta criar dump do schema, sem exportar dados.
