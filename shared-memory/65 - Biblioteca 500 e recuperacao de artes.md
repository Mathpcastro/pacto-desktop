# Biblioteca de 500 referências e recuperação de artes

16/11/2026. Implementado na branch `fix/artes-abertura-biblioteca`, sobre a versão pública 1.13.5. Build Windows local.

## Artes persistidas e abertura no Windows

- Reproduzidas duas perdas de artes: concorrência entre gravações de cards e um blob ausente apesar de existir uma versão da arte em disco. A gravação usa os dados atuais do projeto após salvar a imagem, e a abertura recupera blobs pelo hash da versão salva.
- O índice principal e sua cópia são gravados por troca atômica. Um índice ilegível é preservado com nome `state-damaged-*.json` e o app usa o backup válido. Sem backup válido, os arquivos ficam intactos e o diálogo indica o `startup.log`. A cópia começa a ser criada após a primeira gravação com a correção.
- A versão instalada, o log e o motivo exato dos dois relatos externos não foram confirmados nas máquinas dos clientes.

## Swipe File

- Origem: acervo de pesquisa do Kimi, `cutroom/research/carrosseis_virais/data/acervo_principal_500.json`. Leitura da fonte sem alterações.
- Arquivo: `Carrossell-Swipe-File-500.zip`, 96.232.913 bytes. SHA-256 `34b483d29c20bf40c1881702c3772d7dbdd2566266aa29f5a85654b803d4e2d3`.
- São 500 referências distintas (107 sequências multipágina, 393 parciais), 1.789 imagens de cards, 500 miniaturas e 333 prints de evidência (107 da plataforma e 226 da busca). Outras 167 têm métricas textuais. Imagens otimizadas em WebP. O `scripts/pack-reference-library.py` refaz o ZIP a partir da pasta original.
- **Biblioteca** no menu principal. A pessoa pode arrastar o ZIP para a janela ou escolher Importar Swipe File. O app valida formato, hashes, limites e espaço, confirma a instalação e grava a coleção fora do instalador, sem consumir IA. Uma falha ou recusa preserva o acervo instalado. As 36 referências incluídas seguem disponíveis.
- Pesquisa percorre os 500 registros. A grade monta 24 cards por página e busca miniaturas sob demanda. A tela de detalhes mostra cards, métricas, evidências e fonte quando disponíveis. O compositor recebe só a miniatura escolhida e conserva o tema digitado.

## Evidências

- 273 testes passaram, 1 pulado. Build aprovado. A prova de navegação do Radar, as 9 regressões do renderer, as 46 verificações de interface e as 16 verificações da biblioteca original passaram.
- `scripts/swipe-library-proof.mjs` passou no Electron de desenvolvimento e no Windows empacotado. Com o ZIP real, a importação até aparecer na tela levou 5,6 s no empacotado nesta máquina. Catálogo com 335.944 bytes de metadados, sem imagens em base64. A prova encontrou a última referência, abriu card de detalhe, voltou ao compositor, avançou página, abriu as 36 referências nativas, trocou etapas mantendo duas artes e reabriu o app com o índice de teste corrompido, recuperando as artes e a coleção.
- Executável local: `C:/Users/Admin2/Documents/pacto-app-biblioteca/release/biblioteca/win-unpacked/Carrossell.exe`.
