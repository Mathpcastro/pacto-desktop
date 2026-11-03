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

Preparada para envio da fonte e tag `v0.7.4` e execução do workflow. Confirmar conclusão, Latest/feed e downloads antes de anunciar disponibilidade. A validação local não equivale à publicação concluída.

Limites de geração/Telegram/Instagram reais e Mac físico continuam explicitados na nota 36. Mac sem assinatura/notarização mantém instalação/atualização manual.
