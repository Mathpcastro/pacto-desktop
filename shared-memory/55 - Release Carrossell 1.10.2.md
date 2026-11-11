# Release Carrossell 1.10.2

Publicada em 11/11/2026, com a versão solicitada pelo usuário. Radar implementado no commit `feacd10`; tag `v1.10.2` em `f828862`.

## Radar no menu principal

- O Radar agrupa Ideias, Para revisar e Piloto automático. Com prévias prontas no perfil aberto, o menu abre Para revisar e o Início mostra um atalho. Com a fila vazia, o Radar abre Ideias.
- A fila permite abrir a prévia, publicar, agendar ou descartar. A aba do piloto tem a rotina, o Telegram e os agendamentos. Detalhes em [[54 - Radar na navegacao]].

## Verificação

- Os 229 testes, o build e as provas de navegação do Radar, aprovação, layout, horários e descoberta passaram antes do envio da tag. A aprovação e o agendamento foram testados com dados simulados.
- O [workflow 43088506570](https://github.com/Mathpcastro/pacto-desktop/actions/runs/43088506570) concluiu os cinco jobs com sucesso, incluindo a abertura do pacote nos runners Mac Apple Silicon e Intel.
- A [release pública](https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.10.2) foi publicada como Latest em 11/11/2026 às 19:40:22 UTC, com 11 arquivos e zero artefatos do GitHub Actions.
- `latest.yml` aponta para 1.10.2. Os links de Windows e dos dois Macs responderam HTTP 200. O instalador público do Windows tem 224.841.752 bytes e SHA-512 `aiBI+453…5GwJwQ==`, conforme o feed.
- A validação não incluiu publicação no Instagram, instalação do instalador final na máquina do usuário ou instalação em Mac físico.

## Aviso publicado

O aviso `v1-10-2` entrou no feed público no commit `7b4b259`. O app exibe a novidade a partir da 1.10.2.

**O Radar agora está no menu principal**

Abra o Radar para encontrar ideias, revisar carrosséis e configurar o piloto automático. Quando houver prévias para aprovar, o Início mostra um atalho para a fila.
