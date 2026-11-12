# Release Carrossell 1.11.0

Publicada em 12/11/2026. Espanhol no commit `f2541f3`; tag `v1.11.0` em `563c780`.

## Espanhol, sem mudar o português

- O padrão continua pt-BR. Quem já usa o app não vê diferença até escolher o idioma.
- No menu da conta, em Idioma, a opção Español traduz a interface, os textos fixos dos modelos (por exemplo o convite da capa) e os pedidos enviados à IA. O método continua P.A.C.T.O. A copy pedida sai em espanhol latinoamericano neutro.
- Não houve geração real de carrossel com a conta ChatGPT neste ambiente. O pedido que o app mandaria para o texto do carrossel foi conferido: o método e as fontes do curso seguem no prompt, e o contrato de saída exige espanhol, com CTA curto "Desliza" e "Comenta GUÍA y te la envío".

## Verificação

- 234 testes e o build passaram. A prova Electron `scripts/i18n-proof.mjs` abriu o app em português, trocou para Español, conferiu a tela e o prompt de configuração em espanhol, e voltou para português sem erro de página.
- O [workflow 43147136017](https://github.com/Mathpcastro/pacto-desktop/actions/runs/43147136017) concluiu os cinco jobs com sucesso, incluindo a abertura do pacote nos runners Mac Apple Silicon e Intel.
- A [release pública](https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.11.0) foi publicada como Latest em 12/11/2026 às 03:23:34 UTC, com 11 arquivos e zero artefatos do GitHub Actions.
- `latest.yml` aponta para 1.11.0. Os links de Windows e dos dois Macs responderam HTTP 200. O instalador público do Windows tem 224.902.461 bytes e SHA-512 `+m/ysss6…4Sj3yg==`, conforme o feed.
- A validação não incluiu geração de imagem com a conta ChatGPT, publicação no Instagram, instalação do instalador final na máquina do usuário ou instalação em Mac físico.
- O aviso para os usuários não entrou no `notices.json`. A escrita em `Mathpcastro/pacto-releases` respondeu HTTP 403 (`Resource not accessible by integration`). O texto preparado está abaixo e não foi publicado.

## Aviso preparado, não publicado

**O Carrossell agora fala espanhol**

Abra o menu da sua conta e escolha Español em Idioma. A tela e os próximos carrosséis passam a sair em espanhol.
