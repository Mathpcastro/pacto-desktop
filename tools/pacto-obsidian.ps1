param([switch]$Sync)
$ErrorActionPreference = 'Stop'
$pactoEndpoint = 'http://127.0.0.1:27200/v1/4d084853-7b48-4763-8060-0a5885c57520/mcp'
$pactoToken = [Environment]::GetEnvironmentVariable('OBSIDIAN_MCP_TOKEN', 'User')
if (-not $pactoToken) { throw 'Configure OBSIDIAN_MCP_TOKEN no ambiente local.' }
$pactoHeaders = @{ Authorization = ('Bearer ' + $pactoToken); Accept = 'application/json, text/event-stream'; 'MCP-Protocol-Version'='2025-03-26' }
function Invoke-PactoObsidian($Tool, $Arguments) {
    $pactoRequest = @{jsonrpc='2.0'; id=[guid]::NewGuid().ToString(); method='tools/call'; params=@{name=$Tool; arguments=$Arguments}} | ConvertTo-Json -Depth 15
    $pactoReply = Invoke-RestMethod -Uri $pactoEndpoint -Method Post -Headers $pactoHeaders -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($pactoRequest))
    if ($pactoReply.error) { throw ($pactoReply.error | ConvertTo-Json -Compress) }
    if ($pactoReply.result.isError) { throw ($pactoReply.result.content | ConvertTo-Json -Compress) }
    return $pactoReply.result
}
if ($Sync) {
    $pactoRepo = Split-Path $PSScriptRoot -Parent
    foreach ($pactoNote in Get-ChildItem -LiteralPath (Join-Path $pactoRepo 'shared-memory') -Filter '*.md' -File) {
        $pactoPath = 'Projetos/Carrosseis Que Vendem/' + $pactoNote.Name
        $pactoFile = Join-Path 'C:\Users\Admin2\Documents\Obsidian Vault' $pactoPath
        $pactoArguments = @{path=$pactoPath;content=[IO.File]::ReadAllText($pactoNote.FullName)}
        if (Test-Path -LiteralPath $pactoFile) {
            $pactoCurrentContent=[IO.File]::ReadAllText($pactoFile)
            if ($pactoCurrentContent -eq $pactoArguments.content) { Write-Output ('UNCHANGED ' + $pactoPath); continue }
            if ((Get-Item -LiteralPath $pactoFile).LastWriteTimeUtc -gt $pactoNote.LastWriteTimeUtc) {
                throw ('O vault mudou depois do snapshot local. Leia e reconcilie antes de sincronizar: ' + $pactoPath)
            }
            $pactoArguments.expectedContent=$pactoCurrentContent
        }
        $null = Invoke-PactoObsidian 'create_vault_file' $pactoArguments
        Write-Output ('SYNCED ' + $pactoPath)
    }
} else {
    Invoke-PactoObsidian 'get_server_info' @{} | ConvertTo-Json -Depth 8
    Invoke-PactoObsidian 'list_vault_files' @{directory='Projetos/Carrosseis Que Vendem';limit=30} | ConvertTo-Json -Depth 8
}
