# Carrossell — guia operacional da marca

Direção aprovada: **02, cards em avanço**. Três cards e um chevron vazado no card final. Nome: **Carrossell**, dois S e dois L. O método mantém o nome **P.A.C.T.O.**

## Arquivos de produção

Fonte vetorial do símbolo: `src/assets/brand-mark.svg`. Logotipos com letras em contornos, símbolo isolado, ícones e avatares: `resources/branding/`. Todos os arquivos raster são renderizados a partir do mesmo vetor; o desenho não depende de recortes da prancha gerada por IA.

- `carrossell-logo-light.svg/.png`: logo para superfícies claras.
- `carrossell-logo-dark.svg/.png`: logo para superfícies escuras.
- `carrossell-symbol.svg` e `carrossell-symbol-white.svg`: símbolo isolado transparente.
- `icon-orange.svg/.png` e `icon-graphite.svg/.png`: ícones 1024×1024.
- `icon-16.png` até `icon-1024.png`: tamanhos para aplicação.
- `carrossell.ico`: Windows, sete resoluções de 16 a 256 pixels.
- `carrossell.icns`: Mac, sete resoluções de 16 a 1024 pixels; formato gerado aqui, instalação Mac depende de validação em macOS.
- `instagram-avatar-orange.svg/.png` e `instagram-avatar-graphite.svg/.png`: 1080×1080, fundo cheio para recorte circular.
- `brand-sheet.svg/.png`: prancha dos arquivos finais.

## Cores e legibilidade

| Uso | Cor |
|---|---|
| Marca | #FF5A36 |
| Grafite | #191919 |
| Branco quente | #F6F3ED |
| Ação no tema claro | #BD3C1C, para suportar texto claro legível |

Usar uma única cor no símbolo; não distorcer, rotacionar ou separar os cards. Manter espaço livre de pelo menos um quarto da altura do símbolo. Usar o símbolo sozinho no avatar e no ícone pequeno. Não inserir o nome por extenso dentro do avatar.

## Interface e tutorial existente

Pedido explícito do usuário: preservar fontes, layout e navegação porque o curso já está gravado. A tipografia da interface continua Segoe UI, Georgia e Consolas, conforme o app existente; não foi adicionada família de fontes. O botão de tema e sua preferência persistida permanecem no mesmo lugar. O símbolo e o nome entram no espaço da marca existente.

O logotipo exportado tem letras em contornos derivados de Segoe UI Bold, sem redistribuição de arquivo de fonte. Essa arte não altera a tipografia da interface. A variante textual do cabeçalho preserva Georgia para acompanhar o tutorial.

O branding da interface não força cores, estilo ou identidade nos carrosséis dos compradores.

## Posicionamento

Assinatura de comunicação: **Carrosséis com estratégia de venda.** Endosso, quando necessário: **Com o método P.A.C.T.O.** Linguagem direta, ligada às ações do produto, sem prometer faturamento.

Bio e avatar: `docs/branding/instagram.md`.

## Reconstrução dos arquivos

No Windows com fontTools: `python tools/build-brand-sources.py`. Isso exporta os contornos do wordmark; os JSON/SVG produzidos ficam no repositório. Renderização e empacotamento nativo: `node_modules/.bin/electron scripts/render-brand-assets.cjs`. Os contornos já salvos permitem renderizar os ativos sem instalar ou redistribuir a fonte.

Manter o nome técnico `pacto-desktop`, appId, canais de IPC e feed de atualização existentes. O nome comercial passa a Carrossell; a pasta histórica de dados continua `pacto-desktop`.
