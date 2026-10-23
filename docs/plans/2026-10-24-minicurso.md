# Plano — Minicurso "PACTO em 24 minutos"

## Contexto

O app é o atalho do curso: ele dispensa montar o projeto no ChatGPT, copiar prompts do Notion e assistir às 8 aulas antes de criar. O minicurso revisa o Método P.A.C.T.O. **dentro do app**:
- cada aula pega uma parte das aulas originais e mostra onde ela acontece no app e o que a pessoa faz ali;
- só tela, com narração da voz clonada do Matheus (ElevenLabs, Eleven v4), direto ao ponto;
- um nicho diferente por aula, para mostrar que funciona para qualquer negócio.

Restrição de créditos: o plano Creator tem 23.400 caracteres livres até 06/11/2026, cerca de 24 minutos de fala. O roteiro inteiro fica em no máximo **21.500 caracteres** (uns 22 minutos de fala), e o restante dos 24 minutos são trechos de tela sem narração. Sobram cerca de 1.900 caracteres para regravar trechos.

## Estrutura (6 aulas, ~24 min)

| Aula | Tema (método → app) | Aulas originais | Nicho na tela | Duração | Caracteres |
|---|---|---|---|---|---|
| 1 | **O método e o atalho:** o que é o P.A.C.T.O., o que o app faz por você, conectar o ChatGPT e um tour rápido | 01, 08 | os 4 nichos de relance | 3:00 | 2.600 |
| 2 | **Fundação:** Contexto Oficial da Marca e Design Kit (Efeito Continuidade); o Prompt Mestre é instalado sozinho | 02, 05, 08 | Moda fitness (Creator) | 5:00 | 4.500 |
| 3 | **P · Pauta:** Radar com 30 pautas e Top 10, Modelador de Referências (copiar o motivo, não o conteúdo), oportunidades na biblioteca | 02 | Advogada (Editorial) | 4:00 | 3.600 |
| 4 | **A + C · Arquitetura e Copy:** as 5 arquiteturas, texto primeiro, Copy Engine com humanização, linha editorial e mascote, revisão humana | 03, 04 | Confeiteira (Ilustrado) | 4:30 | 4.000 |
| 5 | **T · Tratamento visual:** escolher entre 1 e 3 capas, a capa como referência, gerar o restante, Correção Visual Rápida | 05, 06 | Confeiteira (continua o projeto da aula 4) | 4:00 | 3.400 |
| 6 | **O · Oferta e rotina:** CTA → DM → Oferta, stories, publicar (celular pelo QR, Google Drive), Ritmo: Volume → Sinal → Repetição, Replicador e as aulas dentro do app | 07, 08, bônus | SaaS Agendei (Clean SaaS) | 3:30 | 3.400 |
| | | | | **24:00** | **21.500** |

As aulas 4 e 5 usam o mesmo projeto, porque texto → capa → cards é um fluxo só e o aluno vê a continuidade.

## Linha de cada aula

Todas seguem o mesmo padrão: **o que o método diz** (15–25 s) → **onde isso está no app** → **fazendo, em tempo real** → **o resultado e o porquê** → **próximo passo** (5 s).

1. **Abertura:** "No curso você monta um projeto no ChatGPT, copia prompts e assiste a 8 aulas. Aqui tudo isso já está instalado." Explica as cinco letras de P.A.C.T.O. sobre a tela inicial, mostra o login com a própria conta ChatGPT ("seus limites, seu estúdio") e passa pela biblioteca, Pautas, Ritmo e "O método" tocando dentro do app.
2. **Entrevista do contexto:** rodadas curtas de perguntas e o documento revisável. "A IA só escreve bem sobre o que entende." Depois o Design Kit: ponto de partida, cores, ilustração, referências visuais e o Efeito Continuidade ("o carrossel parece o seu produto"). Fecha com "Projeto instalado": é aqui que o Prompt Mestre entra.
3. **As 4 fontes de pauta, resumidas:** o Radar sobre o contexto; o Top 10 e o porquê de cada pauta; o Modelador com um print de referência (o que modelar e o que não copiar); a pauta virando carrossel.
4. **Escolher a arquitetura antes da copy:** as 5 arquiteturas na tela de criação; quantidade de cards e objetivo; o texto gerado card a card (função, título, texto, destaque); headlines alternativas de capa; a revisão humana ("a IA acelera, seu julgamento decide").
5. **Capa mais forte que os cards internos:** 3 composições diferentes; a escolhida vira a referência; o restante é gerado com o mesmo traço e o texto na horizontal; uma correção de card específico, sem refazer tudo.
6. **O último card como mini página de venda:** palavra-chave, as duas DMs e "entregue primeiro o que prometeu"; stories alternando caixa de perguntas e oferta; a tela final com QR e Drive; marcar como publicado e registrar o resultado; o Ritmo com a meta e o vencedor acima da média; o Replicador; "Volume, sinal, repetição".

O texto final de cada aula é escrito a partir das páginas da Biblioteca Oficial e das transcrições. Nada de resultados ou números do professor como promessa.

## Gravação

- **Gravador de aula** (`scripts/course-recorder.mjs`, novo): roteiro de ações por aula, executado pela interface em ritmo humano.
  - Um cursor visível (desenhado na página só durante a gravação) se move até cada elemento antes do clique.
  - A digitação é letra por letra, com pausas onde a narração explica.
  - Os quadros vêm do `capturePage` a 8 fps (testar a cadência) e cada passo grava uma marcação de tempo, usada para sincronizar a fala.
- **Partida de cada aula:** usa os Contextos e Design Kits já gerados nos nichos (`Evidencias/nichos/<nicho>/`) para não repetir onboarding fora da aula 2. Quando a aula precisar, entram dados de exemplo (por exemplo, resultados de carrosséis anteriores para o Ritmo), identificados como exemplo.
- **Geração real na conta ChatGPT:**
  - aula 2: entrevistas;
  - aula 3: Radar e Modelador;
  - aula 4: texto;
  - aula 5: 3 capas e 5 cards, mais 1 correção;
  - aula 6: CTA, stories e 1 arte de story.

  São cerca de 10 imagens.
- **Esperas da IA:** viram trechos acelerados de 4 a 12 vezes, com uma marca discreta de "acelerado".

## Edição

- **Vídeo:** 1920×1080, com a janela centralizada sobre o fundo da identidade do app.
- **Elementos fixos:** cartela de abertura ("Aula 0X · P — Pauta", 3 s), indicador da letra do método no canto e cartela final com o próximo passo. São renderizados em HTML pelo próprio Electron, porque o `drawtext` do ffmpeg está sem fontes nesta máquina.
- **Narração:** um arquivo por trecho, gerado com Eleven v4 e a voz "Matheus Castro · PACTO", encaixado nas marcações de tempo. A velocidade de cada trecho de tela se ajusta à fala, como na videoaula aprovada.
- **Legendas:** `.srt` de cada aula, gerado a partir do roteiro e das durações reais.
- **Extensão do `scripts/videoaula.mjs`:** passa a receber um arquivo de blocos (JSON) por aula.

## Ordem de trabalho e aprovações

1. **Roteiros:** escrever os 6, com a contagem de caracteres por aula e no total. **O usuário aprova antes de gastar créditos.**
2. **Gravador:** gravar a aula 1 como piloto e mostrar 30 segundos.
3. **Gravações:** as aulas 2 a 6.
4. **Narração:** gerar com a voz clonada e conferir com o Scribe (só os trechos com nomes difíceis).
5. **Montagem:** as 6 aulas, as legendas e uma folha de conferência com quadros.
6. **Entrega:** `Evidencias/minicurso/` no Obsidian, scripts no repositório e notas 02, 09 e 11.

## Verificação

- Total de caracteres ≤ 21.500 antes de gerar (contagem automática no script).
- Cada aula entre ±15% da duração planejada; soma em torno de 24:00.
- Folha de quadros por aula confirmando que cada fala cai na tela certa.
- Transcrição da narração sem palavras erradas em PACTO, Copy Engine, Design Kit e Radar.

## Fora do plano

- Colocar o minicurso dentro do app (aba "O método"): pode vir depois, com os vídeos hospedados.
- Edição em motion e trilha sonora.
