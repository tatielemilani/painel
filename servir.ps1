# =====================================================================
# servir.ps1: servidor local simples (sem instalar nada) pra testar o painel.
# Uso (na pasta do projeto):
#   powershell -ExecutionPolicy Bypass -File servir.ps1
# Depois abra http://localhost:5173  (feche a janela pra parar)
# =====================================================================
param([int]$Porta = 5173)

$raiz = Join-Path $PSScriptRoot 'frontend'
$tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json'; '.svg' = 'image/svg+xml'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.ico' = 'image/x-icon'
}

$ouvinte = New-Object System.Net.HttpListener
$ouvinte.Prefixes.Add("http://localhost:$Porta/")
$ouvinte.Start()
Write-Host "Painel no ar em http://localhost:$Porta"
Start-Process "http://localhost:$Porta"

while ($ouvinte.IsListening) {
  $ctx = $ouvinte.GetContext()
  $caminho = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ($caminho -eq '') { $caminho = 'index.html' }
  $arquivo = [IO.Path]::GetFullPath((Join-Path $raiz $caminho))

  # Só entrega arquivos de dentro da pasta frontend.
  if ($arquivo.StartsWith($raiz) -and (Test-Path $arquivo -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($arquivo)
    $ext = [IO.Path]::GetExtension($arquivo).ToLower()
    $ctx.Response.ContentType = if ($tipos[$ext]) { $tipos[$ext] } else { 'application/octet-stream' }
    $ctx.Response.Headers.Add('Cache-Control', 'no-store')
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
