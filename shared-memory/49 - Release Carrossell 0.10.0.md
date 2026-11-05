# Release Carrossell 0.10.0

05/11/2026. Publicação autorizada: "Publique usando a skill de publicar que está no obsidian". Skill lida e scripts executados de Projetos/Carrosseis Que Vendem/Skills/publicar-carrossell.

## Conteúdo

- cc4a3e8: Marca › Referências visuais, com upload múltiplo, colar imagem (Ctrl+V/Cmd+V), galeria e remoção. Até seis referências por marca; Contexto e Design Kit preservados.
- O contexto do negócio acompanha as artes. Cenas devem se relacionar ao setor e ao assunto do card: trading com gráficos/candles, padaria com pães/doces, consultoria com planilhas/escritórios, outros setores deduzidos do próprio contexto. A regra vale sem referências anexadas.
- Referências acompanham capas, cards, artes de stories, sugestões de cenas e novas fotos. Capa aprovada ancora os cards seguintes. Modelos prontos conservam sua diagramação.
- Versão/tag v0.10.0: 0f65789.

## Verificação

- 227/227 testes; build passou (aviso de tamanho dos chunks).
- Prova Electron reexecutada antes da release: upload, colar por ClipboardEvent, reload, isolamento entre marcas, remoção persistida, erro ao colar texto/link, documentos preservados, sem erros de página.
- Uma capa nativa real de trading foi gerada e inspecionada: candles, região de suporte, cores e texto corretos. A IA acrescentou um personagem; referências são inspiração, não reprodução literal.
- Não foram geradas capas reais adicionais de padaria/consultoria, nem executado um carrossel completo ou disparo real do piloto. Os caminhos compartilhados foram cobertos pelos testes.
- Limpeza temporária da prova anterior permanece pendente conforme nota 48; não afeta o app e não há autenticação no Git.

## Publicação verificada

- Workflow 42062101666: preparação, Windows, Mac arm64, Mac Intel e publicação concluídos com sucesso.
- Latest pública: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.10.0, publicada em 2026-11-05T16:19:47Z.
- Script verificar-release.sh da skill do Obsidian: todos os checks OK. 11 arquivos; zero artefatos de Actions; feed aponta à 0.10.0; aliases de Mac e PACTO-Windows HTTP 200; instalador completo de 224.840.118 bytes, SHA-512 confere com o feed.

## Aviso publicado

- v0-10-0, commit 826333f em pacto-releases, confirmado no arquivo público, versão mínima 0.10.0.
- Título: Imagens com a cara da sua marca.
- Texto: Adicione imagens em Marca › Referências visuais. As novas artes usam essas referências e o contexto da sua marca para escolher elementos ligados ao seu negócio.
- Botão: Abrir Marca. Aviso comum no sino.
