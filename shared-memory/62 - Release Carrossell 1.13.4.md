# Release Carrossell 1.13.4

13/11/2026. Publicação autorizada pelo usuário ("Sim publique"), feita com a skill [[46 - Skill publicar-carrossell]].

## Problema

A cliente da rotina (ver [[60 - Release Carrossell 1.13.2]] e [[61 - Release Carrossell 1.13.3]]) mostrou os 4 horários do dia (12h, 15h, 18h e 21h) com o erro "Invalid string length".
- **Causa (reproduzida em teste):** cada arte ficava em base64 dentro do `state.json` do perfil, que é reescrito inteiro a cada mudança.
  - Com vários carrosséis de Arte com IA por dia, somando cards, opções de capa e stories, o JSON passa do limite de cerca de 512 milhões de caracteres do JavaScript.
  - A partir daí, toda gravação falha: criar projeto, salvar texto, guardar arte.
  - Explica o "postou um e depois parou" desde o começo.
- **Medição neste computador:** um perfil com 7 projetos tinha 38,7 MB, e cada carrossel de Arte com IA pesava de 15 a 16 MB.

## Conteúdo (`4cd965d`)

- `core/store.mjs`: o `state.json` guarda `carrossell-imagem://<sha1>.<ext>`, e a imagem fica em `blobs/`, gravada antes do `state.json` que a cita.
  - Ao abrir, as referências voltam a ser data URLs, então o resto do app não muda.
  - Uma biblioteca antiga, com base64 dentro, abre normalmente e é convertida na próxima gravação.
  - Uma imagem que sumiu do disco vira campo vazio, e o projeto continua abrindo.
  - Arquivos de `blobs/` sem uso são apagados ao abrir.
  - A mesma imagem em dois lugares vira um arquivo só.
- `tests/store-blobs.test.mjs`: 4 testes. O do limite falha no código antigo e passa no novo.
- `scripts/library-blobs-proof.mjs`: prova Electron sobre uma cópia de uma biblioteca existente.

## Verificação

- 269 testes passando (1 pulado) e build OK.
- **Cópia da biblioteca real deste computador:**
  - 21,3 MB virou 158 KB, e 38,7 MB virou 166 KB;
  - todas as imagens dos cards e das opções de capa voltaram idênticas;
  - abrir leva de 0,1 a 0,25 s.
- **`library-blobs-proof`:** 7 projetos e 42 artes voltaram, as capas aparecem em Conteúdos, e uma nova gravação ficou com 163 KB, sem base64.
- **Não verificado:** a biblioteca da cliente, que deve estar perto de 500 MB. A primeira abertura vai ser mais lenta.

## Para a cliente

Atualizar e abrir o app: a biblioteca é convertida sozinha. Depois, tocar em Retomar nos carrosséis com erro.

## Publicação verificada

- Workflow `43542017982`: os 6 jobs com sucesso.
- `verificar-release.sh 1.13.4 43542017982`: tudo OK.
  - Latest em 14/11/2026 01:48:46 UTC, com 17 arquivos e zero artefatos.
  - `latest.yml` e `latest-linux.yml` apontam para 1.13.4.
  - O SHA-512 confere: Windows com 227.074.108 bytes e .deb com 225.844.948 bytes.
  - Os downloads respondem 200.
- Link: https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.13.4

## Aviso publicado

`v1-13-4` (commit `2c39c2a` em `pacto-releases`), versão mínima 1.13.4, **importante** (faixa no topo), com o botão "Abrir piloto":
- **Título:** "Rotina volta a criar carrosséis".
- **Texto:** "Corrigimos o erro "Invalid string length", que travava a biblioteca de quem já tinha muitos carrosséis. Se algum ficou com erro no Piloto automático, toque em Retomar."
