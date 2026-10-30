import assert from 'node:assert/strict';
import { createServer as httpServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron } from '@playwright/test';
import { createServer } from 'vite';
import { Profiles } from '../core/profiles.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(process.argv[2]||'.cache/analytics-proof');
await mkdir(out,{recursive:true});
const real=process.argv.includes('--real')?JSON.parse(await readFile(join(root,'.cache/analytics-live/report-7.json'),'utf8')):null;
const KEY='ak_analytics_test_only', now=Date.now(), DAY=86400000;
let fail=false, slow=false, visiblePosts=50;
const accounts=[{id:'ca_ana',username:real?.username||'ana.doces',igUserId:'1001'},{id:'ca_loja',username:'loja.oficial',igUserId:'1002'}];
const calls=[];
const posts=real?.posts||Array.from({length:8},(_,i)=>({id:`post${i}`,caption:['O erro que faz seu conteúdo passar despercebido','3 ajustes para um carrossel que as pessoas salvam','Como transformar uma pergunta em conteúdo útil','Uma rotina de posts que cabe na sua semana'][i%4],type:i%2?'IMAGE':'CAROUSEL_ALBUM',timestamp:new Date(now-(i%5+1)*DAY).toISOString(),permalink:`https://www.instagram.com/p/teste${i}/`,likes:90-i,comments:12+i,saves:80-i*7,shares:10+i*5,reach:1400+i*200}));
const fake=httpServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  const body=raw?JSON.parse(raw):{}, path=req.url.replace('/api/v3.1',''), slug=path.split('/tools/execute/')[1];
  const send=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
  if(path.startsWith('/connected_accounts?'))return send({items:accounts.map(a=>({id:a.id,user_id:'test',status:'ACTIVE'}))});
  if(!slug)return send({error:'unexpected route'},404);
  calls.push({slug,account:body.connected_account_id,args:body.arguments});
  const a=accounts.find(a=>a.id===body.connected_account_id), args=body.arguments||{};
  if(fail&&slug==='INSTAGRAM_GET_USER_INFO')return send({error:{message:'Too many requests'}},429);
  if(slow&&a.id==='ca_ana'&&slug==='INSTAGRAM_GET_USER_INFO')await new Promise(r=>setTimeout(r,800));
  let data={};
  if(slug==='INSTAGRAM_GET_USER_INFO')data={id:a.igUserId,user_id:a.igUserId,username:a.username,account_type:'BUSINESS',followers_count:a.id==='ca_ana'?(real?.followers??1520):25};
  if(slug==='INSTAGRAM_GET_USER_INSIGHTS'){
    const name=args.metric[0], days=Math.round((now/1000-args.since)/86400)>10?30:7;
    const value=real?real.metrics[{reach:'reach',profile_views:'profileViews',accounts_engaged:'engaged'}[name]]:{reach:days===30?42000:12400,profile_views:750,accounts_engaged:890}[name];
    data={data:a.id==='ca_loja'||value===null?[]:[{name,total_value:{value}}]};
  }
  if(slug==='INSTAGRAM_GET_IG_USER_MEDIA')data={data:a.id==='ca_loja'?[]:posts.slice(0,visiblePosts).map(p=>({id:p.id,caption:p.caption,media_type:p.type,media_product_type:p.productType,timestamp:p.timestamp,permalink:p.permalink,like_count:p.likes,comments_count:p.comments})),paging:{}};
  if(slug==='INSTAGRAM_GET_IG_MEDIA_INSIGHTS'){
    const p=posts.find(p=>p.id===args.ig_media_id);
    data={data:[['saved','saves'],['shares','shares'],['reach','reach']].filter(([,key])=>p[key]!==null).map(([name,key])=>({name,values:[{value:p[key]}]}))};
  }
  send({data,successful:true});
});
await new Promise(r=>fake.listen(0,'127.0.0.1',r));
const userData=await mkdtemp(join(tmpdir(),'carrossell-analytics-'));
if(!real){
  const profiles=await new Profiles(join(userData,'library')).init(),store=await profiles.store();
  for(const i of [6,5,4,2,1])await store.saveAnalytics({accountId:'ca_ana',days:7,followers:1520-i*9,updatedAt:new Date(now-i*DAY).toISOString()});
}
const server=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});
await server.listen();
const app=await _electron.launch({args:['.'],cwd:root,env:{...process.env,PACTO_USER_DATA:userData,PACTO_DEV_URL:`http://127.0.0.1:${server.httpServer.address().port}`,PACTO_COMPOSIO_URL:`http://127.0.0.1:${fake.address().port}`}});
const step=name=>console.log('✔',name);
try{
  const page=await app.firstWindow(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>window.pacto);
  await page.evaluate(async key=>{
    await window.pacto.request('saveProfile',{profile:{brand:'Analytics · validação',brandContext:'# Contexto\nConteúdo para criadores.',designKit:'# Design Kit\nLaranja e grafite.'}});
    await window.pacto.request('saveComposioKey',{key});
  },KEY);
  await page.reload();
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:/^Marca$/}).click();
  const nav=page.getByRole('navigation',{name:'Seções da marca'});
  await nav.getByRole('button',{name:'Analytics',exact:true}).click();
  const panel=page.getByRole('region',{name:'Analytics do Instagram'});
  await panel.getByRole('heading',{name:'Posts que mais funcionaram'}).waitFor();
  assert.equal(await panel.locator('.analytics-post').count(),Math.min(posts.length,5));
  if(!real)await panel.getByRole('img',{name:/Seguidores coletados/}).waitFor();
  await page.screenshot({path:join(out,'01-analytics-claro.png')});
  step(real?'conta real consultada por leitura e exibida em ambiente isolado':'painel com conta, resumo, histórico inicial e ranking');
  const requestCount=calls.length;
  await nav.getByRole('button',{name:/^Instagram/}).click();
  await nav.getByRole('button',{name:'Analytics',exact:true}).click();
  await panel.getByRole('heading',{name:'Posts que mais funcionaram'}).waitFor();
  assert.equal(calls.length,requestCount,'reabrir a seção usa o cache');
  step('reabrir usa cache, sem novas chamadas');
  if(!real){
    await panel.getByRole('button',{name:'Próximos',exact:true}).click();
    visiblePosts=1;
    await panel.getByRole('button',{name:'Atualizar',exact:true}).click();
    await panel.getByRole('button',{name:'Atualizar',exact:true}).waitFor({state:'visible'});
    assert.equal(await panel.locator('.analytics-post').count(),1,'atualização menor volta à primeira página');
    visiblePosts=50;
    await panel.getByRole('button',{name:'Últimos 30 dias',exact:true}).click();
    await panel.getByText('42.000',{exact:true}).waitFor();
    await panel.getByLabel('Ordenar por').selectOption('shares');
    assert.match(await panel.locator('.analytics-post').first().textContent(),/Uma rotina/);
    await panel.getByRole('button',{name:'Usar no Replicador',exact:true}).first().click();
    await panel.getByRole('button',{name:'Gerar variações',exact:true}).waitFor();
    const s=await page.evaluate(()=>window.pacto.request('bootstrap'));
    assert.equal(s.analytics.sources.length,1);assert.equal(s.projects.length,0);
    step('período, ordenação e importação real para referência sem criar projeto fictício');
    slow=true;
    await panel.getByRole('button',{name:'Atualizar',exact:true}).click();
    await panel.getByLabel('Conta do Instagram').selectOption('ca_loja');
    await panel.getByText('Nenhum post encontrado neste período. Experimente os últimos 30 dias.').waitFor();
    await page.waitForTimeout(1300);
    assert.equal(await panel.locator('.analytics-post').count(),0);
    assert.equal(await panel.getByText('Não disponibilizado',{exact:true}).count(),3);
    await page.screenshot({path:join(out,'02-sem-insights.png')});
    step('conta sem insights e resposta atrasada não misturam contas');
    fail=true;
    await panel.getByRole('button',{name:'Atualizar',exact:true}).click();
    await panel.getByRole('alert').filter({hasText:'pausa'}).waitFor();
    fail=false;slow=false;
    await panel.getByRole('button',{name:'Tentar novamente',exact:true}).click();
    await panel.getByRole('button',{name:'Atualizar',exact:true}).waitFor();
    step('erro de leitura conserva dados e permite nova tentativa');
    await panel.getByLabel('Conta do Instagram').selectOption('ca_ana');
    await panel.getByRole('heading',{name:'Posts que mais funcionaram'}).waitFor();
  }
  await page.evaluate(()=>{document.documentElement.dataset.theme='dark';document.documentElement.dataset.palette='ocean';});
  await page.screenshot({path:join(out,'03-escuro-oceano.png')});
  await page.evaluate(()=>{document.documentElement.style.setProperty('--app-zoom','1.25');});
  await page.setViewportSize({width:700,height:1000});
  await page.screenshot({path:join(out,'04-estreito-125.png')});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  assert.equal(overflow,false,'sem transbordamento horizontal');
  assert.deepEqual(errors,[]);
  step('temas, paleta Oceano e escala 125% sem transbordamento na largura 700');
  await page.evaluate(()=>{document.documentElement.style.setProperty('--app-zoom','1');});
  await page.keyboard.press('Control+k');await page.keyboard.type('Analytics');await page.keyboard.press('Enter');
  assert.equal(await nav.getByRole('button',{name:'Analytics',exact:true}).getAttribute('aria-current'),'page');
  step('Ctrl K abre Analytics');
  if(!real){
    await page.evaluate(()=>window.pacto.request('removeComposioKey'));
    await panel.getByRole('heading',{name:'Os números da sua conta, aqui'}).waitFor();
    step('sem conexão, o painel orienta a conectar uma conta profissional');
  }
  await writeFile(join(out,'checks.json'),JSON.stringify({real:Boolean(real),errors,calls:calls.length,overflow,posts:posts.length},null,2));
}finally{
  await app.close().catch(()=>{});await server.close();await new Promise(r=>fake.close(r));
  const target=resolve(userData),temp=resolve(tmpdir());
  if(target.startsWith(temp+'\\')||target.startsWith(temp+'/'))await rm(target,{recursive:true,force:true}).catch(()=>{});
}
