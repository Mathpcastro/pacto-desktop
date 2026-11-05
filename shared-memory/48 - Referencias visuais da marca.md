# Referências visuais da marca

05/11/2026. Implementação local, sem release, na branch feat/brand-visual-references em C:/Users/Admin2/Documents/pacto-app-visual-refs (base 79abd34, versão 0.9.0). O checkout histórico pacto-desktop/desktop está sujo e não foi alterado.

## Comportamento

- Marca › Referências visuais: upload múltiplo, colar imagem por Ctrl+V/Cmd+V e remover. Até seis imagens PNG/JPEG/WebP, com limite na interface de 10 MB por imagem.
- Reutiliza profile.references para preservar referências antigas, por marca. A ação saveVisualReferences altera somente esse campo, conservando Contexto, Design Kit e demais configurações.
- O contexto da marca passa a acompanhar imageContext; direção pede objetos, diagramas e ambientes coerentes com o negócio e o card. O exemplo trading cita candles e suporte/resistência como ilustração, sem tratar gráficos inventados como cotações ou prova de resultado.
- imageRefs reserva espaço para referências da marca junto da capa, imagem exata escolhida e logo. Até seis anexos por chamada, limite do cliente Codex. Com muitos anexos pode entrar apenas uma seleção das referências da marca.
- Capas, cards internos, arte de story, sugestões de cenas e primeira foto de uma série recebem as referências. As fotos seguintes mantêm a primeira foto como âncora.
- As referências inspiram, sem copiar textos/logos da imagem; as imagens exatas continuam em Imagens da marca. Estilos prontos mantêm a diagramação escolhida.

## Verificação

- 227/227 testes; build Vite passou (aviso de chunks grandes existente).
- Cinco testes novos: persistência e validação; contexto na direção visual; referências não excluídas por excesso de anexos; chamadas de capa/card/story; nova foto contextualizada.
- scripts/visual-references-proof.mjs passou em Electron real: upload, evento de colar imagem, reload, isolamento entre perfis, remover e reabrir, erro de colar texto/link e nenhum erro de página. O paste usa ClipboardEvent na prova; não lê o clipboard pessoal.
- Screenshot: .cache/visual-references-proof/referencias.png.
- scripts/visual-references-native-proof.mjs --real: gera uma capa com a conta ChatGPT numa cópia temporária, usando um gráfico ilustrativo criado como fixture. Resultado da geração registrado abaixo após inspeção.

## Pendente

- Publicação de nova versão e aviso curto no app, quando solicitada. Não houve publicação, alteração de rotina ou postagem no Instagram nesta tarefa.

## Geração nativa real

- A conta ChatGPT gerou uma capa real em .cache/visual-references-proof/native-trading-cover.png. Inspeção visual: título e apoio corretos, fundo escuro, candles verdes/vermelhos, linha e região de suporte. A IA acrescentou um personagem; referências funcionam como inspiração, não como reprodução exata.
- A geração terminou e salvou a capa. A limpeza falhou com EBUSY na pasta temporária de prova. As tentativas de limpeza foram bloqueadas pela revisão automática, inclusive da cópia de auth.json. Limpeza manual pendente em %TEMP%/carrossell-refs-native-Vtbuis. Nenhum arquivo de autenticação entrou no repositório.
- Não foi testado um carrossel completo real ou um disparo do piloto. O caminho compartilhado de capa/card/story/foto foi coberto por testes automatizados com o transporte de geração simulado.

## Ajuste solicitado: universo visual de qualquer marca

Regra reforçada tanto na descrição de cena durante a escrita quanto na geração da arte. Mesmo sem referências anexadas, inferir objetos e ambientes do Contexto da Marca: trading com gráficos/candles, padaria com pães/doces/forno, consultoria com planilhas/escritório/planejamento; outros setores deduzem seus próprios elementos. Não misturar os exemplos entre marcas. Cada cena deve explicar o card, com variação, mantendo pedidos explícitos de arte tipográfica/minimalista. Cinco testes da área e build passaram após esse ajuste de prompt. Não foram geradas capas reais adicionais de padaria ou consultoria.
