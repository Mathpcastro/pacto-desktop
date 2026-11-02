---
project: carrossell
status: stories-e-copy-implementados-localmente; demais itens em pesquisa
tags: [carrossell, roteiro, stories, copy, comentarios, anuncios, provedores]
---
# Roteiro: comentários, stories, anúncios e provedores — 02/11/2026

Pedido do usuário (Claude, 02/11/2026): (1) automação de comentários pelo Composio ou, se não der, ManyChat, sem o comprador criar app na Meta; (2) stories simples no fim do fluxo, preto/branco, com copy muito boa, e melhorar a copy dos carrosséis tirando a cara de IA usando skills de copy do O Setup; (3) planejar com calma anúncios e criativos para tráfego pago; (4) avaliar login com Claude e Gemini para gerar carrosséis.

## 2. Stories e copy — implementado (local, sem commit)

Código em `Documents\pacto-app`, branch `codex/instagram-analytics`, sem commit nem release.

- **Stories só de texto**: Publicar › Enviar ganhou o quadro "Stories para divulgar"; Publicar › Stories tem Fundo preto/Fundo branco, texto editável por story (refaz o PNG ao sair do campo), aviso de qual sticker colar (enquete ou caixa de perguntas) e a "Arte com IA" como opção. PNGs 1080×1920 montados pelo app (`storyHtml` em `core/templates.mjs`), texto fora das faixas que o Instagram cobre; com sticker, o texto sobe e a metade de baixo fica livre. Vão no ZIP (`stories/NN.png` + `stories.txt`), Drive e celular, como antes.
- **Sequência**: Gancho → 2 a 4 Conteúdo (um ponto do carrossel por story, reescrito como fala) → Enquete ou Caixa de perguntas → CTA para o post com a palavra-chave do kit de CTA. Mantém o trecho da Aula 08.
- **Copy anti-IA**: `core/copy.mjs` traz `VOICE_RULES` (adaptado para pt-BR das skills `copywriting` e `ai-tells` de coreyhaines31/marketingskills, MIT, indicadas no acervo do O Setup) e `aiTells()`, que acha travessão, "não é X, é Y", "não só X, mas Y", pergunta respondida, revelação com dois-pontos, lista de negações, aberturas e fechos prontos, palavras de palestra e exclamações em série. As regras entram no texto do carrossel, no editor-chefe, no kit de CTA/DM e nos stories. Depois do editor-chefe, se sobrar sinal de IA, roda **uma** correção só desses trechos (aceita apenas se diminuir os sinais).
- Ações novas: `storyTheme`, `saveStory` (runtime e preload). Campo novo no projeto: `storyTheme`; nos stories, `art` = `simples` ou `ia`.

Validação: 109/109 testes (`npm test`, 4 novos), `npm run build` ok, e prova real no Electron com a conta ChatGPT deste computador (`node scripts/stories-proof.mjs`): carrossel de 5 cards no estilo Texto, kit de CTA (CHECKLIST), 6 stories escritos pela IA, PNGs em preto e branco e capturas das telas Enviar e Stories em `.cache/stories-proof/`. Não houve teste de empacotado, de postagem nem avaliação da copy pelo usuário.

## 1. Automação de comentários — pesquisado, não implementado

**Composio (verificado na documentação do toolkit Instagram, versão 20261014_00):** existem `INSTAGRAM_GET_IG_MEDIA_COMMENTS`, `INSTAGRAM_POST_IG_COMMENT_REPLIES`, `INSTAGRAM_SEND_TEXT_MESSAGE`, `INSTAGRAM_LIST_ALL_CONVERSATIONS` etc. Limites:
- A própria FAQ do Composio diz que responder comentário pode falhar com o OAuth gerenciado, porque o app deles ainda não tem a permissão de gestão de comentários aprovada pela Meta; o caminho atual é **app próprio na Meta** (o que o usuário quer evitar). Composio diz que está trabalhando nessa aprovação.
- `SEND_TEXT_MESSAGE` não inicia conversa nova (só responde em conversa existente, dentro da janela de mensagens) e não tem "resposta privada" a comentário.
- O toolkit tem **0 triggers**: não há aviso de comentário novo; um app de desktop só poderia consultar periodicamente enquanto estiver aberto.

**ManyChat (verificado no Swagger da API pública):** a API tem tags, campos personalizados, campos do bot (`setBotField`, `setBotFieldByName`, `setBotFields`), `sendFlow`, `getFlows`, assinantes. **Não existe endpoint para criar automações ou gatilhos**. O comprador conecta o Instagram dentro do ManyChat (parceiro oficial da Meta), sem criar app.

Desenho proposto, a validar com uma conta ManyChat real:
- Fase A (quase sem código): o Carrossell já gera palavra-chave, DM 1 e DM 2; acrescentar um passo a passo e botões "copiar" para montar a automação "comentou PALAVRA → DM" no ManyChat.
- Fase B: um modelo (template) do Carrossell instalado uma vez no ManyChat, com o gatilho de comentário lendo os textos de campos do bot; o app preenche esses campos pela API a cada carrossel. Pontos a confirmar: se o gatilho por palavra-chave aceita valor dinâmico, plano exigido para a API (informação de mercado: Pro; não verificado aqui) e o limite de um texto por campo.
- Composio: voltar a avaliar quando a permissão de comentários estiver aprovada no OAuth gerenciado.

## 4. Login com Claude e Gemini — pesquisado

- **Claude**: a documentação do Claude Agent SDK diz que, salvo aprovação prévia, a Anthropic **não permite** que produtos de terceiros ofereçam login do claude.ai ou usem os limites da assinatura; o caminho é **chave de API** (o comprador paga por uso). Tecnicamente encaixa: Claude escreve a copy e um HTML do card, e o app já transforma HTML em PNG (`renderer().png`, o mesmo dos estilos Texto/Tweet). Não gera imagem.
- **Gemini**: o login com Google do Gemini CLI funciona para quem usa o próprio CLI, mas a página de termos do Gemini CLI diz que acessar esses serviços por **software de terceiros** com o OAuth do CLI viola os termos e pode suspender a conta. A geração de imagem pelo CLI (extensão Nano Banana) já pede **chave de API do AI Studio** (`NANOBANANA_API_KEY`). O caminho seguro é a chave do AI Studio direto na API Gemini (texto + imagem).
- Conclusão: login de assinatura só segue viável no ChatGPT/Codex (já em uso). Claude e Gemini entrariam como "conectar com chave de API", com custo por uso para o comprador. Preço e cota gratuita de imagem do Gemini não foram conferidos.

## 3. Anúncios e criativos — plano (sem código)

Referências levantadas: skill `ad-creative` de coreyhaines31/marketingskills (MIT): entradas reais obrigatórias (posts vencedores, comentários, avaliações), sem prova inventada, especificações Meta (texto principal com 125 caracteres visíveis, título de 40, descrição de 30), biblioteca de 22 modelos de anúncio estático com nível de alcance (Headline Statement, Founder Message, Review Card, FAQ Card, Problem/Solution, Before/After, Tweet/Reddit screenshot, Ugly/post-it…) e hipóteses de teste com métrica e direção.

Etapas propostas:
1. **Pesquisa de referências**: 30 a 50 anúncios brasileiros ativos na Biblioteca de Anúncios da Meta (há ferramenta `ads_library_search` disponível no Claude), por nicho dos compradores; classificar formato, gancho, tipo de imagem e tempo no ar.
2. **Formatos que o app já sabe montar sem IA de imagem**: print de post (estilo Tweet), texto em fundo liso, foto simples UGC com texto (estilo Texto + foto), FAQ e "carta do fundador". Foto realista só quando for do próprio negócio ou cena sem rosto.
3. **Copy**: mesma `VOICE_RULES` + regras de anúncio (uma promessa, prova real ou demonstração, CTA único), 3 a 5 variações por conceito, cada uma citando de onde veio (post vencedor do Analytics, comentário real, Contexto da Marca).
4. **Checagem de política Meta** antes de exportar (atributos pessoais, antes/depois, saúde e renda).
5. **Saída**: pacote com 4:5, 9:16 e 1:1 + planilha de textos. Subir direto no Gerenciador fica para depois e exige conta de anúncios do comprador.
6. **Teste com os próprios anúncios do Carrossell** antes de liberar aos compradores.

Decisões abertas para o usuário: formatos da primeira versão; se anúncio é um formato novo no Estúdio ou uma etapa depois do carrossel vencedor; se vale conectar a conta de anúncios.


## 4b. Modo agente: Claude e Gemini pela CLI, sem a conta ChatGPT — implementado (local, sem commit)

Pedido do usuário (02/11/2026): a pessoa abre o Claude ou o Gemini e esses agentes usam a CLI `carrossell`, com a estrutura do app, sem depender do ChatGPT. Isso é a própria pessoa usando a ferramenta dela; o app não usa a assinatura de ninguém.

- `carrossell marca salvar --contexto <md> --design <md> [--nome]`: o agente grava Contexto e Design Kit que escreveu.
- `carrossell criar --pauta "..." --agente`: cria o carrossel sem escrever o texto.
- `carrossell tarefa <id> texto|cta|stories|arte [--pasta]`: grava em arquivo o MESMO pedido e o MESMO esquema JSON que o app manda para a conta ChatGPT (método, fontes do curso, Contexto da Marca, VOICE_RULES). A arte traz Design Kit e texto de cada card.
- `carrossell texto|cta|stories <id> --arquivo <json>`: grava pela mesma validação do app (recusa body com instrução, aponta sinais de texto de IA, stories viram PNG preto/branco).
- `carrossell card <id> <n> --html <arquivo>` (HTML 1080×1350 renderizado pelo app, scripts bloqueados por CSP; Google Fonts funciona) ou `--imagem <png>` (para agentes que geram imagem).
- Estilos de modelo (Texto, Texto preto, Tweet) já funcionavam sem ChatGPT: `capas`, `escolher-capa`, `gerar`.
- Refatoração: `planPrompt`, `savePlan`, `ctaPrompt`/`ctaFrom` e `storiesPrompt` são compartilhados entre a conta ChatGPT e o modo agente. Guia `carrossell ajuda --agente` e tela "Use o Carrossell pelo seu agente" citam o Gemini CLI.

Validação: 111/111 testes (2 novos em `tests/agent.test.mjs`, com o Codex proibido de ser chamado), build ok. Prova real: CLI contra o app aberto em segundo plano com pasta de dados vazia e `account.connected=false`; Claude (esta sessão) fez o papel do agente: marca → criar --agente → tarefa texto (88 KB) → texto (0 sinais de IA) → aprovar → tarefa arte → 6 cards em HTML → exportar 6 PNGs + legenda. **Não testado:** Gemini CLI (não instalado neste computador), Claude Desktop sem a aba Code (não roda comandos), app empacotado e release. Comprador só recebe os comandos novos numa nova versão.

### Caminho dentro do app (02/11/2026)

- Onboarding, primeira tela: quadro "Usa o Claude ou o Gemini em vez do ChatGPT?" → abre a janela de agentes. A etapa Conta tem o mesmo atalho.
- Janela "Gere carrosséis pelo Claude, Gemini ou Codex": abas por agente com 1) instalar o agente (Claude `irm https://claude.ai/install.ps1 | iex`; Gemini `npm install -g @google/gemini-cli`, Node 20+; Codex), 2) instalar o comando carrossell, 3) abrir e colar um pedido pronto do modo agente.
- Início: o aviso sem ChatGPT tem o link "gere pelo Claude ou pelo Gemini"; menu do avatar e paleta citam Claude/Gemini.
- Carrosséis do agente ficam na biblioteca do app (mesmo armazenamento da CLI) e mostram a etiqueta do agente (`criar --agente claude|gemini|codex` grava `madeBy`). Ao salvar a marca pela CLI, a janela aberta sai do onboarding na hora.
- Prova na janela real sem ChatGPT (`node scripts/agent-mode-proof.mjs`): telas do caminho, CLI com a janela aberta, carrossel de 4 cards no Início com etiqueta "Claude". 111/111 testes, build ok. Capturas em `.cache/agent-mode-proof/`. Em desenvolvimento o passo 2 mostra o comando node; no instalado, o botão "Instalar o comando carrossell".

### CLI com stories, copy nova, revisão e postagem (02/11/2026)

- `carrossell stories <id> [--fundo preto|branco]` e `carrossell cta <id>` sem `--arquivo` usam a conta ChatGPT do app, com a voz humana; com `--arquivo`, gravam o que o agente escreveu. `fundo-stories <id> preto|branco` troca o fundo. `exportar --so-stories` exporta só os stories.
- `carrossell revisar <id>` ou `--arquivo <texto|json>`: sinais de texto de IA em cards, legenda, CTAs, DMs e stories + alertas do método. `projeto` agora mostra stories, kit de CTA, fundo e quem criou.
- MCP P.A.C.T.O.: `pacto_prepare_carousel` leva as VOICE_RULES e a sequência de stories; `pacto_review_carousel` aponta sinais de IA por card (`ai-tell`).
- Publicar e agendar já existiam na CLI (`postar --confirmar`, `--em`, `agendados`, `cancelar-agendamento`) e valem para carrosséis do agente (teste confirma que passam na checagem de postagem). Postar stories no Instagram pela API não existe no app.
- Validação: 113/113 testes. Prova real pela CLI com a conta ChatGPT: kit de CTA, 6 stories em fundo branco e `revisar` sem sinais de IA. `--so-stories` só coberto por teste (o app em segundo plano da prova tinha sido aberto antes da mudança).
