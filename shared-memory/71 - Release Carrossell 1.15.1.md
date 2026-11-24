# Release Carrossell 1.15.1

Publicada em 24/11/2026 às 10:48:26, horário de Brasília. Correção solicitada após o teste completo de um carrossel no Windows.

## Problema e correção

Na 1.15.0, clicar em **Gerar o texto** podia retornar HTTP 400. O esquema de saída do Codex trazia `persona` e outros campos de UGC fora da lista de propriedades obrigatórias.

- `363bd01` separa os esquemas enviados ao Codex para Arte com IA e UGC. Os dados opcionais de cena, produto e imagem no UGC aceitam `null`. O formato de arquivo usado pela CLI mantém a compatibilidade.
- `9b13f5f` sobe a versão para 1.15.1.
- `7e775ca` ajusta o teste de `--version` para consultar a versão de `package.json`. O primeiro pipeline parou porque o teste ainda esperava 1.15.0. O build publicado saiu de `main` com o ajuste de teste e o mesmo código do app da tag.

## Verificação

- No Windows, `npm test` com a 1.15.1 registrou 333 aprovados, zero falhas e dois pulados. O build Vite e os nove casos de regressão do Estúdio em Electron passaram. Na prova de UI, a janela de licença foi dispensada com **Agora não**.
- Um carrossel de **Arte com IA** sobre vender SaaS foi gerado com o ChatGPT real no build corrigido para Windows. A prova passou pela geração de texto, três capas, escolha de capa, geração dos demais cards e exportação. O ZIP contém quatro PNGs de 1080 × 1350, conferidos visualmente, e a legenda. O carrossel ficou no perfil de teste.
- O pipeline original da tag parou no teste da CLI ([run 45405734126](https://github.com/Mathpcastro/pacto-desktop/actions/runs/45405734126)). O [run 45406309173](https://github.com/Mathpcastro/pacto-desktop/actions/runs/45406309173) concluiu com seis jobs aprovados. Ele cobre testes e empacotamento de Windows, Linux, Mac Apple Silicon e Mac Intel, além do smoke nos Macs.
- A [release pública](https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.15.1) está marcada como Latest, com 17 arquivos e zero artefatos de Actions. Os três feeds indicam 1.15.1. Os links dos Macs responderam HTTP 200, incluindo os ZIPs do feed. Os SHA-512 do instalador Windows de 227.119.862 bytes e do .deb de 228.025.132 bytes conferem com os feeds.
- A prova de geração real foi executada no Windows. A verificação pública do atualizador cobriu a disponibilidade e a integridade dos downloads.

## Aviso no app

**Volte a gerar texto no Estúdio**

“A geração de texto no Estúdio voltou a funcionar. Se o seu carrossel ficou parado, abra o rascunho e clique em Gerar o texto.”

Aviso `v1-15-1`, versão mínima 1.15.1. Publicação confirmada no [arquivo público de avisos](https://raw.githubusercontent.com/Mathpcastro/pacto-releases/main/notices.json), commit `589a936`.
