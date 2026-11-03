# Referências e quantidade dinâmica de cards — 0.7.3

## Objetivo

Publicar a biblioteca com 36 referências já implementada em `feat/carrossell-reference-templates` e permitir que a pessoa escolha qualquer quantidade de 1 a 10 cards, inclusive enquanto o carrossel está sendo processado.

## Abordagens consideradas

1. **Cancelar, adaptar e retomar (escolhida).** Uma ação de runtime específica atualiza a quantidade, cancela com segurança a operação incompatível, adapta o texto quando necessário e retoma a arte pendente. Preserva IDs, texto e imagens dos cards que continuam válidos.
2. Alterar apenas o metadado `cardCount`. Seria pequeno, mas não mudaria a geração em andamento nem a sequência final; não atende ao pedido.
3. Cortar ou duplicar cards localmente sem nova copy. Evitaria uma chamada de IA, mas poderia remover o CTA, criar enchimento e quebrar a progressão editorial.

## Interface

- O composer da página Início mantém **Automático** e passa a oferecer todas as quantidades de 1 a 10 para carrossel. Materiais e apresentações começam em 2 páginas/slides.
- O Estúdio mostra um seletor **Tamanho** com opções de 1 a 10 cards, usando o mesmo pill/popover e o design system existente.
- O seletor continua utilizável durante escrita e geração de arte. A escolha usa a nova ação `resizeCarousel`; não contorna o Runtime nem altera IPC existente além da ação allowlisted.

## Fluxo e dados

- `CARD_COUNTS` passa a aceitar `0` (automático) e todos os inteiros de 1 a 10.
- Um carrossel de um card pode ser salvo, aprovado, receber arte e ser exportado. Documentos continuam exigindo ao menos duas páginas.
- Quando ainda não existe texto e nenhuma escrita está em andamento, mudar o tamanho apenas salva a preferência.
- Mudar durante a escrita cancela o turno antigo e reinicia a escrita com a nova quantidade.
- Quando já existe texto e a quantidade difere do número de cards, o app pede uma adaptação para exatamente a nova quantidade, preservando IDs e conteúdo não afetado.
- Ao aumentar, cards preservados não são redesenhados; apenas cards novos ou desatualizados entram na fila.
- Ao diminuir, a arquitetura é condensada e os cards excedentes saem da sequência ativa. Cards preservados mantêm seus dados e imagens.
- Se o texto ainda não foi aprovado, o fluxo para na revisão. Se já foi aprovado e a capa existe, a arte pendente é retomada automaticamente.
- Tokens cancelados recebem uma promessa de conclusão. A adaptação só começa depois que o trabalho antigo terminou, impedindo gravações tardias de uma configuração anterior.

## Erros e limites

- A ação rejeita valores fora de 1–10, projetos que não são carrosséis e operações concorrentes não relacionadas ao projeto.
- Falhas na adaptação preservam o projeto e os arquivos já gravados, com status e mensagem de erro existentes.
- A exportação continua recusando qualquer sequência com arte ausente, desatualizada ou em geração.

## Integração das Referências

- Fazer merge dos commits da branch local sobre `main`/`0.7.1`, sem levar a alteração não commitada do lockfile da worktree original.
- Preservar as 36 referências, miniaturas WebP, busca, filtros, tela lazy e integração ao composer.
- Não implementar o order bump nem alterar Store/IPC para o pacote comercial futuro.

## Verificação

- Testes de validação para todos os valores de 0–10 e rejeição de valores inválidos.
- Testes de Runtime para mudar durante a escrita e durante a arte, incluindo aumento, redução, ausência de escrita tardia e retomada de pendentes.
- Teste de carrossel de um card do texto à exportação.
- Suíte completa, build, regressões do renderer, fases da UI e provas das Referências.
- Prova real da interface para o seletor e as opções 1–10, sem simular geração nativa de imagens.
- Publicar `0.7.3`, acompanhar Windows/macOS e validar release, downloads, `latest.yml` e zero artefatos do Actions.
