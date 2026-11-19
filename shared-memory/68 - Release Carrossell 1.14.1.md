# Release Carrossell 1.14.1

19/11/2026. Publicação pedida pelo usuário ("suba somente o x.x.+1 na versão e faça o release"), feita com a skill [[46 - Skill publicar-carrossell]]. Inclui três entregas sobre a 1.14.0.

## Conteúdo

- **`1bb3a24` · Capa segue o post da Biblioteca.**
  - O `referenceId` do anexo era descartado ao salvar o projeto. Agora é mantido, e projetos antigos são reconhecidos pelo nome do anexo.
  - O post vira o MODELO VISUAL da arte; a direção de arte cede a ele e o post nunca é colado no card.
  - Prova real com a conta ChatGPT: a capa passou a seguir o layout do post CAR-0230.
- **`1bb3a24` · Cenas de fotos.** A cena pendente mostra a ideia em texto e "Aprove para gerar a foto". As aprovações entram numa fila, uma foto por vez.
- **`af3c151` · Pacote de slideshows virais do TikTok.**
  - A Biblioteca aceita os pacotes `kimi-500` e `tiktok-slideshows` lado a lado, cada um com seu ponteiro.
  - Uma aba por coleção, nichos por coleção, chip TikTok, views e salvos.
  - ZIP gerado por `scripts/pack-tiktok-slideshows.py` a partir de `cutroom/research/tiktok_slideshows`: **154** slideshows, 1.141 imagens, 60,7 MB. Títulos vêm do OCR do Windows.
- `67b42a8`: versão 1.14.1.

## Verificação

- 277 testes passando (1 pulado) e build OK.
- Provas Electron: `scenes-queue-proof` e `tiktok-pack-proof` (com as 500 instaladas, o ZIP real importa em ~3 s).
- **Não verificado:** a fila das cenas gerando fotos reais.

## Publicação verificada

- Workflow `44440938499`: os 6 jobs com sucesso.
- `verificar-release.sh 1.14.1 44440938499`: tudo OK.
  - Latest em 19/11/2026 02:05:43 UTC, com 17 arquivos e zero artefatos.
  - `latest.yml` e `latest-linux.yml` apontam para 1.14.1.
  - O SHA-512 confere: Windows com 227.082.439 bytes e .deb com 227.875.900 bytes.
- Link: https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.14.1

## Aviso publicado

`v1-14-1` (commit `04bc642`), versão mínima 1.14.1, no sino:
- **Título:** "Referência da Biblioteca vira o modelo da capa".
- **Texto:** "Ao usar uma referência da Biblioteca, a capa agora segue o layout do post escolhido. Em Marca › Fotos, as cenas mostram a ideia e as aprovadas são geradas uma de cada vez."
- **Botão:** saiu como "Abrir Biblioteca", que abria Conteúdos (os avisos não abrem a Biblioteca de referências). Foi corrigido em seguida para "Ver cenas de fotos" (`brand:fotos`), no commit `77f3ca2`.

## Pendente

- **ZIP do TikTok:** só funciona da 1.14.1 em diante. Pode ir para a área de membros do plano Completo.
- **Página /app nova:** `Método Pacto/artifacts/app-v6-angulo-apps-2026-11-19/`, ainda não publicada. Ela promete 500 slideshows do TikTok; hoje são 154.
