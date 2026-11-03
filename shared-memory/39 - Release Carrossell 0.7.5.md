# Release Carrossell 0.7.5

03/11/2026. Publicação autorizada pelo usuário: release sem artefatos de GitHub Actions.

## Conteúdo e preparação

- Novo layout do piloto aprovado em HTML e implementado em `d61af4c`; detalhes em [[38 - Hierarquia do piloto automatico]].
- Versão em package.json/package-lock.json: 0.7.5; tag fonte `v0.7.5`, commit `990c341`.
- Testes locais 209/209; build e instalador Windows passaram.
- Executável Windows empacotado: 9/9 verificações com perfil temporário, dados manuais e sem contas/geração/publicação externa. Inclui piloto, painel de possibilidades, agentes, renderização de modelos, ZIP 1080×1350 e PDF.
- Workflow `41693720236`: instaladores Windows, Mac arm64 e Mac x64 enviados diretamente ao release. Sem upload/download-artifact.
- Evidências locais: `C:/Users/Admin2/Documents/Codex/2026-11-02/qual-o-jeito-mais-f-cil/outputs/release-0.7.5`.

## Publicação verificada

- Workflow `41693720236` concluído com sucesso em todas as etapas: preparação, Windows, Mac arm64, Mac x64 e publicação.
- Latest público: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.7.5, publicado em 03/11/2026 às 18:31:44 UTC. `isDraft:false`, 11 arquivos esperados.
- Feed público `latest.yml` retorna HTTP 200 e aponta à 0.7.5. Instalador público completo de 224.824.989 bytes baixado; SHA-512 confere com o feed.
- Aliases Windows Carrossell/PACTO, Mac Apple Silicon e Mac Intel retornam HTTP 200.
- Artefatos de Actions: zero na execução, no repositório fonte e no repositório de releases.

Windows instalado: fechar e reabrir para buscar a nova versão; após baixar, usar **Reiniciar e atualizar**. Mac mantém instalação manual; nenhum teste em Mac físico foi feito nesta etapa.
