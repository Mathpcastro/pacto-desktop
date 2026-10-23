# Método e base de conhecimento

## Fontes primárias

As oito aulas explicam o método. A Biblioteca Oficial do Notion entrega os prompts, sequências, checklists e exemplos originais. A implementação deve usar ambos; não reconstruir de memória um prompt que está disponível no material.

## Etapas P.A.C.T.O.

1. **Pauta:** conhecer negócio, oferta e público; modelar ângulos de referências sem copiar o conteúdo; gerar um radar de ideias e priorizar testes.
2. **Arquitetura:** organizar a sequência dos cards de acordo com a proposta.
3. **Copy:** texto específico, humano, curto, com uma ideia por card e legenda coerente.
4. **Tratamento visual:** Design Kit próprio, respiro, hierarquia e continuidade com produto/página.
5. **Oferta:** benefício, entrega gratuita específica, CTA/palavra-chave, DM e ponte para oferta.

## As cinco arquiteturas, conforme o material oficial

- Lista Útil.
- Tutorial.
- Framework.
- Estudo de Caso.
- História → Método → Oferta.

Os modelos oficiais trazem base de dez cards, mas o prompt manda ajustar a quantidade sem enchimento. A fala traduzida do Pauta deixa a enumeração ambígua; usar os nomes originais do Notion como referência.

## Onboarding

O contexto de marca entrevista sobre negócio/oferta, público e nível de consciência, dores/desejos, transformação/diferenciais, autoridade/territórios, ativos gratuitos, voz e limites. O Design Kit entrevista sobre produto/público, personalidade, cores, fotos/ilustrações/mascote, sensação, referências, proibições e densidade.

Salvar a **resposta consolidada** como Contexto Oficial da Marca e Design Kit Oficial. O prompt que faz a entrevista não é a identidade da marca.

## Organização no código

- `desktop/resources/pacto/manifest.json`: oito vídeos, origem, idioma e cobertura.
- `desktop/resources/pacto/transcripts/`: texto bruto recebido do Pauta, uma aula por arquivo.
- `desktop/resources/pacto/notion-manifest.json`: 13 fontes originais e suas URLs.
- `desktop/resources/pacto/notion/`: material oficial em português.
- `desktop/resources/pacto/method.md`: contexto operacional consolidado para o modelo, concluído e utilizado na prova real.
- `desktop/resources/pacto/method.json`: cinco etapas, cinco arquiteturas, 23 campos de entrevista e 34 regras com fontes.
- `desktop/resources/pacto/extracted-prompts.json`: 19 prompts originais completos, validados literalmente contra as páginas oficiais.
- `desktop/core/knowledge.mjs`: consulta, busca, briefing, preparação e revisão textual.
- `desktop/mcp/server.mjs`: servidor MCP padrão por stdio.

## Cuidados de fidelidade

Não reutilizar provas pessoais do professor como resultados do comprador. Não transformar alegações históricas sobre algoritmo, preços de ferramentas, limites de planos ou conversão em fatos atuais ou garantias. Prompts originais são preservados; inconsistências do material precisam ser registradas separadamente.

Inconsistências já identificadas: CTA na capa/final é absoluto no Mestre, mas contextual nos prompts específicos; checklist do Copy Engine pergunta se há excesso de texto e depois manda corrigir qualquer resposta negativa. A consolidação deve aplicar estratégia contextual e preservar o original intacto.

O método consolidado está também em [[13 - Metodo operacional]], e os prompts originais em [[14 - Prompts originais]]. Todos os 19 blocos foram conferidos com as fontes; nenhuma fala foi usada para inventar um prompt ausente.
