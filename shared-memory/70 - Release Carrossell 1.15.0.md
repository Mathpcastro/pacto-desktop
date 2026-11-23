# Release Carrossell 1.15.0

23/11/2026. Publicação pedida pelo usuário ("pode publicar o carrossell"), feita com a skill [[46 - Skill publicar-carrossell]]. Junta o PR #3 (`feat/cli-onboarding-provedor`, merge `a8c5ba9`) e duas correções de teste (`862c0f2`, `35d036a`) sobre a 1.14.1. Versão **minor**: recursos novos.

**Problema:** quem usa Claude ou Gemini não tinha como gerar carrossel sem conectar o ChatGPT, a CLI ficava escondida e o app não tinha um formato UGC com rosto consistente por perfil.

## Conteúdo

- **`880f959` · CLI que cria o carrossel inteiro.**
  - `carrossell criar --slides plano.json` importa e revisa a copy, aprova o texto, gera e escolhe a capa e monta os cards num comando, sem ChatGPT. `--exportar` grava os PNGs e a legenda.
  - Se o comando falha antes da primeira exportação, o rascunho é descartado (antes ficava um projeto órfão).
  - `licenca status` e `licenca ativar --email X --aceito`: a resposta mostra só estado, e-mail mascarado, validade e código.
  - Correções da CLI: o launcher acha o executável do pacote Linux (antes saía com erro 127), `--version`/`-v`/`versao` respondem em texto simples e argumentos inválidos falham antes de abrir o app.
- **`880f959` · CLI visível no perfil.** O menu do avatar mostra o status da CLI abaixo de **Conta ChatGPT** e abre o mesmo guia do menu de perfis: instalação, status, comandos, prompt e plano copiáveis.
- **`880f959` · Onboarding com escolha de provedor.** A primeira tela de um perfil novo é **Como você quer gerar?**: ChatGPT (recomendado) ou **Claude ou Gemini — pelo terminal (CLI)**. O caminho da CLI abre o guia e, ao concluir, vai ao estúdio sem exigir conta ChatGPT. A escolha fica salva por perfil.
- **`880f959` · Skill de ganchos de slideshow.**
  - `resources/pacto/skills/hooks-slideshow.md`: versão compacta (oito categorias de gancho) dos hooks de slideshow do TikTok, entra no roteiro do ChatGPT e na tarefa de texto do agente, logo após o Swipe File.
  - A capa usa uma categoria e deixa o produto para depois do gancho; os slides 2–4 começam a cumprir a promessa.
  - `carrossell skills` lista as skills. Fonte completa em `docs/sources/hooks-slideshow-fonte.md`.
- **`7ecee9b` · Carrossel UGC com avatar realista.**
  - Persona por perfil do Instagram (nome, idade, aparência, estilo, cenário, nicho, foto-âncora), uma ativa por vez, em **Marca › Persona UGC**.
  - Anti-clone: avisa quando duas personas são parecidas, por atributos e por hash perceptual (dHash) da foto.
  - Prompts de âncora e de cena (`resources/pacto/ugc/prompts-ugc.md`) para gerar fotos realistas pela conta ChatGPT do usuário, sempre a partir da âncora e do bloco MANTER.
  - Estilo **UGC com avatar** em **Início**: capa com a foto e o gancho por cima, cards que entregam a promessa, um card com o produto numa moldura de celular e CTA no fim. O produto vem de imagem ou de link (captura móvel 390×844).
  - Estúdio: **Refazer foto** por cena e exportação para TikTok (`tiktok.txt`). CLI: `persona listar|criar|usar|foto|apagar|prompt` e `criar --slides --estilo ugc`.
- **`5688972` · Ajustes pós-prova UGC.** Captura do link do produto sem o debugger do Electron (derrubava o app no Linux), moldura retrato ou paisagem conforme a imagem, diálogo da persona em grade e hashtags do TikTok sem palavras curtas ou genéricas.
- **`5655a4e` + `827e9b8` · Biblioteca de avatares e cara do perfil.**
  - Salva a âncora original, o nome e o bloco MANTER para reutilizar o avatar numa geração UGC nova; renomear e apagar.
  - **Usar como cara do perfil** em cada card: vira a foto do perfil no app (não mexe na conta do Instagram). A prévia do Tweet em **Marca › Perfil** usa essa foto e o nome do avatar.
  - Depois da foto-âncora, o botão principal é **Salvar avatar**. CLI: `avatares listar|renomear|apagar|cara-do-perfil` e `--avatar`.
- **`69e359b` + `d4d5e5d` + `af76894` · Correção da foto-âncora.**
  - O diálogo **Criar persona** fechava ao escolher a foto, porque o seletor nativo disparava o fechamento antes do React marcar o editor como ocupado. O fechamento agora é bloqueado durante a escolha e nos 800 ms seguintes; só o Nome é obrigatório; o aviso de semelhança pode ser dispensado.
  - Bug do GTK no Linux (Chromium 152 / Electron 44.9.0): no seletor GTK, duplo clique ou `Ctrl+L` + `Enter` devolvem "cancelado" mesmo com arquivo escolhido. Saída: o quadro da foto-âncora aceita **arrastar e soltar** e mostra essa dica quando o seletor volta cancelado.
  - Log local `import-reference.log` (sem dados da imagem) para diagnóstico.
- **Espanhol.** Todas as telas novas têm tradução em `core/i18n-es.json` (+156 linhas). O bloco da skill de ganchos fica em português também nos pedidos em espanhol; a copy sai no idioma do projeto.
- **`4f9ddb0` · Provas Electron** `renderer-regression` e `onboarding-proof` reconhecem a nova tela de provedor.
- **`862c0f2` + `35d036a` · Testes da foto-âncora no CI.** O teste lia um arquivo que só existia na máquina de desenvolvimento e usava `/tmp` também no Windows. Agora usa `tests/fixtures/01-ancora.png` e a pasta temporária do sistema no Windows. O app não mudou.

## Verificação

- `npm test`: 332 testes, 331 passando, 0 falhas, 1 pulado (também sem o arquivo de desenvolvimento). `npm run build` OK.
- Provas Electron: `cli-proof` (criar → aprovar → capa → exportar pela CLI com o app aberto), `renderer-regression` (9 casos) e `persona-anchor-e2e` (importação da foto-âncora e diagnóstico) passaram.
- Na máquina de prova (Linux sem chaveiro), a janela de licença foi fechada com **Agora não** antes das provas.
- **Não verificado:**
  - `license-proof` para na ativação porque a máquina de prova não tem chaveiro do sistema. A mensagem nova (`storage_unavailable`) apareceu corretamente.
  - `onboarding-proof` passa pela escolha de provedor, mas para na etapa **O que você vende?**: a prova está desatualizada desde antes desta versão.
  - Instaladores no Windows e no Mac físicos.

## Publicação verificada

- Tag `v1.15.0` (em `a8c5ba9`) disparou o run `45240453532`: os testes falharam no CI (arquivo de teste ausente) e o run foi cancelado. A release ficou só como rascunho; a 1.14.1 continuou Latest.
- Run `45242529790` (manual, `main` em `862c0f2`): Windows falhou no mesmo teste (`/tmp`); cancelado.
- Run `45245226670` (manual, `main` em `35d036a`): os 6 jobs com sucesso. O código do app é o mesmo da tag; só os testes mudaram.
- `verificar-release.sh 1.15.0 45245226670`: tudo OK.
  - Latest em 23/11/2026 16:19:08 (Brasília), com 17 arquivos e zero artefatos.
  - `latest.yml` e `latest-linux.yml` apontam para 1.15.0.
  - O SHA-512 confere: Windows com 227.119.524 bytes e .deb com 228.048.104 bytes.
- A 1.14.1 continua publicada (17 arquivos, downloads 200).
- Link: https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.15.0

## Aviso

Não publicado: aguarda confirmação do usuário. Texto proposto:
- **Título:** "Carrossel UGC com o rosto do seu perfil".
- **Texto:** "Agora você cria um avatar realista em Marca e usa no estilo UGC com avatar. Quem usa Claude ou Gemini também pode gerar pelo terminal: veja no menu do seu perfil."
- **Botão:** "Criar meu avatar" (`brand`).

## Rollback

- Release anterior: 1.14.1 (`v1.14.1`). SHA da `main` antes do merge: `138dbd0`.
- Detalhes em `/workspace/pacto-release-1150/rollback/ROLLBACK.md` (box do Grok Bot).
