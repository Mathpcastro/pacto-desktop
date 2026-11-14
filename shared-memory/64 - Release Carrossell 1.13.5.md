# Release Carrossell 1.13.5

Publicada em 14/11/2026. Correção no commit `fb3b449`, tag `v1.13.5` no commit `b0c35e1`.

## Revisão no Estúdio

Uma conversa longa ocupava o painel de revisão, deixando o checklist inacessível mesmo com o roteiro salvo. O histórico agora rola em uma área de altura limitada. A revisão segue com os seis itens e permite aprovar o roteiro e gerar as capas. Ver [[63 - Revisao do Estudio com conversa longa]].

## Verificação

- 269 testes passaram, 1 pulado. Build e prova Electron de histórico longo, teclado, checklist, aprovação e geração de capas passaram.
- O [workflow 43609881064](https://github.com/Mathpcastro/pacto-desktop/actions/runs/43609881064) concluiu os seis jobs com sucesso. O pacote abriu nos runners Mac Apple Silicon e Intel.
- A [release pública](https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.13.5) é a Latest desde 14/11/2026 às 12:28:57 de Brasília, com 17 arquivos e zero artefatos de GitHub Actions.
- Downloads Windows, Mac Apple Silicon, Mac Intel e Linux .deb responderam HTTP 200. Os três feeds apontam para 1.13.5. SHA-512 e tamanho conferiram no instalador Windows (227.074.250 bytes), Linux .deb (227.870.116 bytes) e nos ZIPs de atualização Mac de ambas as arquiteturas.
- Validação em ambiente isolado. A instalação final e a origem do bloqueio na máquina da cliente ainda não foram confirmadas com o log do atendimento.

## Aviso no app

Publicado como `v1-13-5` no commit `8657f59` do repositório de releases, com versão mínima 1.13.5.

**Revisão acessível em conversas longas**

Mesmo quando a conversa do Estúdio fica longa, você consegue marcar os itens da revisão, aprovar o roteiro e seguir para a capa.
