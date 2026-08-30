$ErrorActionPreference = "Stop"

$path = Join-Path (Get-Location) "lib\neon\painel-query.server.ts"

if (-not (Test-Path $path)) {
    throw "Arquivo não encontrado: $path"
}

$content = Get-Content $path -Raw -Encoding UTF8

$old = "where i.indrelid = format('public.%I', `$1)::regclass"
$new = "where i.indrelid = format('public.%I', `$1::text)::regclass"

if ($content.Contains($new)) {
    Write-Host "Correção já aplicada em lib\neon\painel-query.server.ts" -ForegroundColor Green
    exit 0
}

if (-not $content.Contains($old)) {
    throw "Trecho esperado não encontrado. Não alterei o arquivo para evitar corromper o código."
}

$content = $content.Replace($old, $new)

Set-Content -Path $path -Value $content -Encoding UTF8

Write-Host "Corrigido: parâmetro `$1 agora possui cast explícito ::text." -ForegroundColor Green
Write-Host "Arquivo: $path"
Write-Host ""
Write-Host "Agora execute:" -ForegroundColor Cyan
Write-Host "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
Write-Host "npm run dev"
