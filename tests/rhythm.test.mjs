import test from 'node:test';
import assert from 'node:assert/strict';
import { rhythm, reminder, weekStart, score } from '../core/rhythm.mjs';

const now = new Date('2026-10-29T12:00:00'); // quinta-feira
const day = 86400000;
const ago = d => new Date(now.getTime() - d * day).toISOString();
const projects = [
  {id:'a',title:'Publicado hoje',publishedAt:ago(0)},
  {id:'b',title:'Esperando',publishedAt:ago(3)},
  {id:'c',title:'Vencedor',publishedAt:ago(5),results:{comments:80,saves:300,sales:2}},
  {id:'d',title:'Mediano',publishedAt:ago(9),results:{comments:5,saves:10,sales:0}},
  {id:'e',title:'Rascunho',publishedAt:''},
];

test('week starts on Monday and counts this week publications', () => {
  assert.equal(weekStart(now).getDay(),1);
  const r = rhythm(projects,{weeklyGoal:4},now);
  assert.equal(r.goal,4); assert.equal(r.publishedThisWeek,2,'today and 3 days ago (Monday)');
});

test('pending results wait 48h; winners are ranked against the person average', () => {
  const r = rhythm(projects,{},now);
  assert.deepEqual(r.pending.map(p=>p.id),['b']);
  assert.deepEqual(r.winners.map(p=>[p.id,p.aboveAverage]),[['c',true],['d',false]]);
  assert.equal(score({comments:1,saves:2,sales:1}),13);
  assert.equal(rhythm([projects[2]],{},now).winners[0].aboveAverage,false,'one result alone is not a signal');
});

test('reminder fires once a day only with pending results', () => {
  assert.match(reminder(projects,{},now),/Esperando/);
  assert.equal(reminder(projects,{lastReminderAt:ago(0.5)},now),null);
  assert.match(reminder(projects,{lastReminderAt:ago(2)},now),/Esperando/);
  assert.equal(reminder([projects[0]],{},now),null);
});
