# Roteiro de fidelidade ao curso

Diagnóstico de 23/10/2026 (Claude), feito comparando as aulas e a Biblioteca Oficial com o app e com o carrossel de prova gerado pelo onboarding. Atualização no fim: o usuário escolheu o fluxo, e os itens 1 e 3 foram implementados (ver [[02 - Estado e proximos passos]]).

## Diagnóstico

- **Copy:** no plano de prova, o campo "Texto" dos cards recebeu instruções ("Função: capa. Apresentar cinco erros…") em vez da copy final. O esquema do plano mistura função, texto e direção. O app também não envia ao modelo o Copy Engine literal (`N04-prompt-01`), o prompt de Arquitetura (`N03-prompt-01`), a Anatomia dos vencedores nem o Swipe File, que no curso ficam como fontes do projeto do ChatGPT. O resultado é uma copy cautelosa e genérica.
- **Fluxo:** o app faz pauta, arquitetura e copy numa chamada só. O curso separa: pauta e esqueleto → aprovação → Copy Engine com humanização e REVISÃO FINAL → revisão humana → imagens → correção pontual → legenda com CTA na primeira linha.
- **Tipografia:** a capa saiu com título de sete palavras empilhado em quatro linhas de serifa pesada. A regra do curso é headline horizontal, curta e legível. Hoje a fonte e o layout ficam a critério do gerador de imagem, que também pode errar acentos.
- **Recursos do curso ausentes:** Radar de Pautas, Modelador de Referências, adaptador de hooks e Swipe File, estratégia CTA → DM → Oferta, último card como mini landing page, Correção Visual Rápida guiada, checklist de revisão humana, Replicador de Vencedores (3+3+2+2) e a rotina Volume → Sinal → Repetição.
- **Branding:** o executável usa o ícone padrão do Electron. Já existem os temas claro e escuro, mas não a opção de seguir o sistema.

## Skills avaliadas (catálogo do Setup e plugins locais)

- `carrossel-pro` (plugin local, 1.8.1): oito kits tipográficos testados (editorial, tech, brutalist, serif-classic, clean-sans, warm, playful, corporate), paletas por token, templates HTML e exportação com fontes embutidas.
- Humanizer (blader, MIT): padrões anti-IA. O Copy Engine do curso já inclui humanização equivalente; o Humanizer serve como segunda passada e referência de padrões, com aviso de licença.
- Copy Editing / Seven Sweeps (borghei, MIT + Commons Clause): passadas de clareza, especificidade e fricção no CTA. A cláusula Commons restringe a venda, então use só como inspiração.
- Canvas Design, Theme Factory, Brand Guidelines (Anthropic, Apache-2.0): princípios de composição e tema por estilo.
- O comprador roda o Codex pela própria conta e não executa skills do Claude Code. Por isso as regras úteis entram como recursos internos do app, respeitando as licenças.

## Prioridades propostas

1. Copy fiel ao curso: esquema do card com função, título, texto final e ênfase; fluxo em duas etapas com Copy Engine literal, Anatomia, Swipe e REVISÃO FINAL; três opções de capa pelas fórmulas A–F; amostras de voz no onboarding.
2. Tipografia e visual: texto diagramado pelo app com os kits do carrossel-pro sobre a ilustração gerada sem texto, ou prompt de imagem mais rígido; estilo por preset; Correção Visual Rápida com opções de problema.
3. Recursos do curso: Radar de Pautas, Modelador de Referências, kit CTA → DM → Oferta exportado junto, checklist de revisão humana, Replicador de Vencedores e painel de métricas.
4. Branding e distribuição: ícone e wordmark do app, tema seguindo o sistema, assinatura digital, teste em Windows limpo, licença e checkout do produto de R$47.

## Decisões em aberto

- Como renderizar o texto dos cards: a IA desenha o card inteiro, como no curso, ou o PACTO diagrama o texto com fontes reais sobre a arte da IA.
- Identidade do app: usar uma marca já existente para o PACTO ou criar ícone e paleta do zero.

## Atualização 23/10/2026

- Decidido: a IA desenha o card inteiro; o texto é aprovado antes e a capa é escolhida entre opções.
- Feito: copy com as fontes literais e o esquema por card, revisão humana, capas, Correção Visual Rápida, Radar, Modelador, Replicador e CTA → DM.
- Pendente: prova real com IA (limite da conta), branding e itens de distribuição.
