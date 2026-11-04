import test from 'node:test';
import assert from 'node:assert/strict';
import { aiTells, tellsIn, VOICE_RULES } from '../core/copy.mjs';
import { storyHtml } from '../core/templates.mjs';

test('finds the common AI tells in Portuguese copy', () => {
  const labels = text => aiTells(text).map(t => t.label);
  assert.deepEqual(labels('Não é sobre postar mais, é sobre postar melhor.'),['contraste "não é X, é Y"']);
  assert.deepEqual(labels('O resultado? Mais vendas.'),['pergunta respondida']);
  assert.deepEqual(labels('Spoiler: ninguém lê legenda longa.'),['revelação com dois-pontos']);
  assert.deepEqual(labels('Sem planilha, sem reunião, sem dor de cabeça.'),['lista de negações']);
  assert.deepEqual(labels('Sua jornada começa aqui'),['palavra de palestra']);
  assert.deepEqual(labels('Três passos — e pronto'),['travessão']);
  assert.deepEqual(labels('Corrija o preço antes de mandar o orçamento. Quem pergunta o valor quer saber o prazo também.'),[]);
  assert.deepEqual(tellsIn([['card 1','Isso muda tudo!!'],['legenda','ok']]).map(t=>t.where),['card 1','card 1']);
  assert.match(VOICE_RULES,/travessão/);
});

test('story template escapes text and keeps the Instagram safe zones', () => {
  const html = storyHtml({story:{text:'<b>Oi</b>\nlinha 2',sticker:''},theme:'branco'});
  assert.match(html,/&lt;b&gt;Oi&lt;\/b&gt;/); assert.match(html,/background:#ffffff/); assert.match(html,/padding:300px 112px 420px/);
  assert.match(storyHtml({story:{text:'x'},theme:'outro'}),/background:#000000/);
});
test('copy rules carry spoken voice, persuasion and the flow of the chosen architecture', async () => {
  const { flowRules, PERSUASION_RULES, VOICE_RULES, ARCHITECTURE_FLOW } = await import('../core/copy.mjs');
  assert.match(VOICE_RULES, /Escreva como fala/);
  assert.match(PERSUASION_RULES, /Benefício antes de recurso/);
  for (const id of ['lista-util', 'tutorial', 'framework', 'estudo-de-caso', 'historia-metodo-oferta']) {
    const rules = flowRules(id);
    assert.match(rules, /FIO CONDUTOR/);
    assert.ok(rules.includes(ARCHITECTURE_FLOW[id]));
  }
  const any = flowRules('');
  for (const flow of Object.values(ARCHITECTURE_FLOW)) assert.ok(any.includes(flow));
});
