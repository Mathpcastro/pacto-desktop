# Release Carrossell 1.13.3

13/11/2026. Publicação autorizada pelo usuário ("publique tudo como 1.13.3 mesmo"), feita com a skill [[46 - Skill publicar-carrossell]]. A versão juntou três entregas.

## 1. Diário do piloto e "Copiar diagnóstico" (`c5f0c22`)

**Problema:** a mesma cliente da [[60 - Release Carrossell 1.13.2]] ficou um dia sem post, com o PC ligado, e não havia log para descobrir o motivo.

- **`pilot.log`** na pasta de dados, uma linha JSON por acontecimento, até 512 KB, mais uma cópia antiga (`.1`). Registra:
  - app aberto (e se foi pela tarefa do sistema) e PC suspenso ou acordado;
  - um pulso a cada 30 min;
  - cada horário (atraso, criou ou falhou, e o motivo) e cada adiamento;
  - espera pelo ChatGPT e tarefa do sistema;
  - etapas e status dos trabalhos, decisões e erros do Telegram.
- **Privacidade:** o diário não guarda token, endereço nem e-mail. Se não conseguir gravar, o piloto continua.
- **PC acordando:** o piloto confere os horários na hora.
- **Botão "Copiar diagnóstico"** (rodapé do Piloto automático): copia a versão, o fuso, o Telegram, o ChatGPT, as rotinas, os últimos trabalhos e as 200 últimas linhas do diário.

## 2. Idioma do carrossel (`bc75703`)

- Em Ajustes › Idioma, ao criar: Português do Brasil, Português de Portugal, Espanhol ou Inglês. A escolha vira o padrão do perfil (`settings.contentLanguage`) para a rotina, o Telegram e o Radar.
- O projeto guarda `language`. Texto, CTA, stories, material, capas, artes e rótulos desenhados seguem esse idioma. Os documentos da marca seguem o idioma da tela. Projetos antigos não mudam.
- Os contratos de saída para pt-PT (AO90, vocabulário e gramática de Portugal) e inglês americano mantêm as regras de voz do método.

## 3. Arte com IA com direção de arte (`ffb89c0`)

O usuário escolheu o caminho A: a IA continua desenhando o card inteiro.
- **Catálogo** (`core/art-direction.mjs`): 8 estilos de ilustração e 8 tipografias, escolhidos automaticamente pelo Contexto da Marca.
- **Layout por card:** capa, ilustração em cima ou embaixo, comparação só com antes e depois de verdade, e fechamento com a palavra-chave em botão.
- **Hierarquia:** título grande e subtítulo com 40% a 50% do tamanho. Na Arte com IA o subtítulo tem até 18 palavras.
- **Ajuste:** em Marca › Design Kit › Direção de arte, com "Automático · sugestão". A escolha do usuário passa a ser obrigatória.

## Verificação

- 265 testes passando (1 pulado) e build OK.
- Provas Electron: `pilot-diagnostics-proof`, `pilot-routine-error-proof`, `content-language-proof` e `art-direction-proof`.
- **Comparação real:** 10 artes geradas com a conta ChatGPT local (dois negócios, antes e depois, mais 2 refeitas depois das correções).
  - Perfil infantil: melhora clara na fonte, no guache e no layout.
  - SaaS: cenas mais ricas, mas o estilo 3D suave não foi seguido.
- **Não verificado:**
  - um carrossel inteiro gerado pelo app com a nova direção;
  - a geração real em inglês e em pt-PT;
  - o diário no computador da cliente, que só registra a partir desta versão.

## Publicação verificada

- Workflow `43526046619`: os 6 jobs com sucesso.
- `verificar-release.sh 1.13.3 43526046619`: tudo OK.
  - Latest em 13/11/2026 23:24:23 UTC, com 17 arquivos e zero artefatos.
  - `latest.yml` e `latest-linux.yml` apontam para 1.13.3.
  - O SHA-512 confere: Windows com 227.073.074 bytes e .deb com 225.842.608 bytes.
  - Os downloads respondem 200.
- Link: https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.13.3

## Aviso publicado

`v1-13-3` (commit `c24bc00` em `pacto-releases`), versão mínima 1.13.3, no sino, com o botão "Ver direção de arte" (abre Marca › Design Kit):
- **Título:** "Carrossel em outro idioma e artes mais bonitas".
- **Texto:** "Agora você gera em português de Portugal, espanhol ou inglês em Ajustes › Idioma. A Arte com IA escolhe ilustração e fonte pelo seu negócio, e você troca em Marca › Design Kit."
