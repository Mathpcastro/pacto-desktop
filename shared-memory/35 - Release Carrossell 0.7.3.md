---
project: carrossell
status: teste-local (não publicada)
tags: [carrossell, release, teste-local]
---
# Build local de teste Carrossell 0.7.3 — 02/11/2026

Esta versão está em preparação somente para teste local do usuário. Não foi publicada e não houve merge, push, tag, release ou execução de workflow. A publicação está condicionada ao teste e à aprovação do usuário.

## Novidades

- Biblioteca de Referências com 36 modelos, miniaturas WebP, busca, filtros, carregamento lazy e integração ao composer.
- Quantidade de cards Automática ou de 1 a 10 no composer e seletor Tamanho no Estúdio.
- Alteração do tamanho durante escrita e geração de arte pela ação `resizeCarousel`, com cancelamento seguro da operação anterior, adaptação da copy e retomada somente das artes pendentes.
- Carrossel de um card permitido do texto à exportação; documentos continuam exigindo ao menos duas páginas.

## Evidências já observadas antes do bump

- Base `c04635b` limpa.
- Suíte completa: 130/130 testes aprovados.
- Build Vite concluído.
- Regressões do renderer: 9/9 aprovadas.
- Fases da interface: 46/46 aprovadas.
- Provas de Referências/Tamanho: 16/16 aprovadas.

## Validação do build local 0.7.3

- `npm run dist` concluído com Node independente e `--publish never`: `release/Carrossell-Setup-0.7.3.exe`, 226944563 bytes, SHA-256 `bf9a460571c92a3422b109f2b9de253035ca6d5c45e3c35a3bfa91e35ec30728`.
- `release/win-unpacked/Carrossell.exe` gerado com `FileVersion` 0.7.3 e `ProductVersion` 0.7.3.0.
- ASAR com `package.json` 0.7.3, chunk de Referências, 36 IDs e 36 miniaturas WebP embutidas.
- `scripts/packaged-smoke.mjs` aprovado sobre cópia temporária da biblioteca de prova: 8 aulas, ZIP com dois PNGs 1080×1350 e legenda, modelo 1080×1350, PDF válido de 21479 bytes e zero erros de página. O app instalado não foi aberto e dados reais do usuário não foram alterados.
- Testes focados após o bump: 26/26 em `value`, `images` e `references`.
- `git diff --check` sem erros.

## Limites desta etapa

- IA real e alteração de tamanho durante processamento real não foram testadas nesta etapa; as provas anteriores não substituem esse teste do usuário.
- Não houve teste em Mac físico nem build local de macOS.
- Instalador Windows sem assinatura de código; macOS segue sem assinatura e notarização Apple.
- Não abrir o app instalado nem alterar dados reais do usuário nesta preparação.
- Não há release pública, tag, merge, push ou workflow associado a este build de teste.
