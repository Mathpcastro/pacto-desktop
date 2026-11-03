# Release Carrossell 0.7.4

03/11/2026. Publicação autorizada pelo usuário para atualizar o Carrossell e gravar um vídeo. Requisito: sem artefatos de GitHub Actions.

## Conteúdo

Piloto automático e controle por conversa pelo Telegram; home mais limpa; painel de possibilidades com agentes/CLI; stories a partir do texto sem exigir artes de carrossel; referências, logos e tamanho dinâmico da 0.7.3 preservados. Detalhes e limites em [[36 - Conversa Telegram e descoberta]].

## Preparação validada

- Base `v0.7.3` / `9614d92`, implementação `0310f04`; integrada a nota de publicação `604a70b` de `origin/main`.
- Versão `0.7.4` em package.json e package-lock.json.
- 206 testes, build, fases46, renderer9, referências16, descoberta15 e pilotoUI14 aprovados antes da publicação.
- `npm run dist` gerou instalador Windows, blockmap e latest.yml da 0.7.4.
- Executável Windows empacotado aberto com perfil temporário: 9/9 verificações, incluindo versão, painel, agentes, piloto, renderização dos modelos, ZIP 1080×1350 e PDF, sem contas ou publicação externa.
- Workflow existente envia Windows, Mac arm64 e Mac x64 diretamente à release em rascunho; não usa upload/download-artifact. Só marca Latest depois dos três builds e da conferência dos arquivos.
- Antes da execução, v0.7.3 continuava Latest e a lista de artefatos de Actions tinha total_count 0.

## Publicação

Publicada como Latest em 03/11/2026, 13h52 (Brasília): https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.7.4.

- Tag fonte `v0.7.4`: `8bcf417`. Código do app contém o piloto e a conversa implementados em `28ed89b` e `0310f04`.
- A primeira execução `41676477508` ficou presa no processo Node da preparação e foi cancelada. Correção de CI `881e46d`: leitura da versão por jq e timeout de 5 minutos na preparação. Não alterou o código do app nem moveu a tag.
- Execução final `41677450506`, disparada na main `881e46d`, concluída com sucesso: preparação, Windows, Mac arm64, Mac x64 e publicação. https://github.com/Mathpcastro/pacto-desktop/actions/runs/41677450506.
- 11 arquivos públicos, incluindo instalador Windows, blockmap, latest.yml, aliases Windows e os dois Macs. Instaladores enviados direto à release, sem artefatos de Actions.
- `latest.yml` público responde HTTP 200 e anuncia 0.7.4; instalador completo baixado pelo endereço do atualizador, 224.822.146 bytes, SHA-512 conferido com o feed.
- Links fixos Carrossell/PACTO Windows, Mac Apple Silicon e Mac Intel responderam HTTP 200. Fonte, execução e repositório de releases com total_count 0 para artefatos de Actions.
- Evidências locais: `C:\Users\Admin2\Documents\Codex\2026-11-02\qual-o-jeito-mais-f-cil\outputs\release-0.7.4`.

No Windows instalado, fechar e reabrir o app inicia nova checagem; depois do download, o aviso oferece **Reiniciar e atualizar**. O pacote publicado aponta ao repositório público correto em app-update.yml.

Limites de geração/Telegram/Instagram reais e Mac físico continuam explicitados na nota 36. Mac sem assinatura/notarização mantém instalação/atualização manual.
