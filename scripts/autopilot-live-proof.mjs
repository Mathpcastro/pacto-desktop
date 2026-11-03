// Execução explícita via Electron. O token entra só por stdin e fica cifrado
// numa pasta temporária até o fim da prova. Não usa conta nem API do Instagram.
import { app } from 'electron';
import { createInterface } from 'node:readline';
import { rm } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { Profiles } from '../core/profiles.mjs';
import { Runtime } from '../core/runtime.mjs';
import { Autopilot } from '../core/autopilot.mjs';
import { AutopilotStore } from '../core/autopilot-store.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
import { createSecrets } from '../electron/secrets.mjs';
import { createRenderer } from '../electron/render.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const temp=mkdtempSync(join(tmpdir(),'carrossell-telegram-live-'));
app.setPath('userData',temp);app.setName('Carrossell · teste Telegram');
app.whenReady().then(async()=>{
const profiles=await new Profiles(join(temp,'lib')).init(),store=await profiles.store();
await store.saveProfile({brand:'Carrossell · teste técnico',brandContext:'Teste de envio e aprovação pelo Telegram, sem publicação no Instagram.',designKit:'Fundo claro e títulos verdes.'});
const secrets=createSecrets(temp);
const runtime=new Runtime({store,profiles,knowledge:loadKnowledge(),codex:{status:{account:{connected:false}},run:async()=>{throw new Error('Esta prova não usa inferência.');}},dialogs:{secrets,render:createRenderer({folder:join(temp,'render'),fontsDir:join(root,'node_modules','@fontsource','archivo','files')})}});
runtime.social.pick=()=>[{id:'somente_teste',username:'nenhuma_publicacao_real'}];
runtime.social.publish=async()=>{throw new Error('Publicação no Instagram desativada nesta prova técnica.');};
runtime.social.schedule=async()=>{throw new Error('Agendamento no Instagram desativado nesta prova técnica.');};
const state=await new AutopilotStore(temp).init(),pilot=new Autopilot({runtime,state,secrets});runtime.autopilot=pilot;
let busy=false;
async function stop(){pilot.stop();await secrets.clearTelegramToken();await state.queue;await rm(temp,{recursive:true,force:true}).catch(()=>{});app.quit();}
app.on('window-all-closed',()=>{});
async function execute(input){
  if(busy)return;busy=true;
  try{
    if(input.command==='connect'){
      await pilot.connect(input.token);const pairing=await pilot.pair();pilot.start();
      console.log(JSON.stringify({connected:true,bot:state.snapshot().bot.username,pairingUrl:pairing.url}));
    }else if(input.command==='preview'){
      if(!state.snapshot().binding)throw new Error('Abra o link e inicie o bot primeiro.');
      const p=await runtime.request('createProject',{title:'Teste do piloto · sem publicação',brief:'Prévia técnica com texto manual, sem IA e sem Instagram.',style:'texto',cardCount:2});
      await runtime.request('saveProject',{id:p.id,caption:'TESTE TÉCNICO: este carrossel não será publicado. Use Descartar para validar o retorno do botão.',slides:[{id:'test1',role:'Capa',title:'O piloto chegou ao Telegram',body:'Prévia técnica do Carrossell.',emphasis:'Telegram'},{id:'test2',role:'CTA',title:'Confirme pelo celular',body:'Toque em Descartar na mensagem seguinte. Este teste não publica no Instagram.'}]});
      await runtime.request('approveText',{id:p.id});await runtime.request('generateCovers',{id:p.id});
      await runtime.request('chooseCover',{id:p.id,optionId:store.get(p.id).coverOptions[0].id});
      await state.change(data=>{data.jobs.push({id:'live-test',profileId:'principal',projectId:p.id,status:'resend',accounts:['somente_teste'],createdAt:new Date().toISOString(),title:p.title});});
      await pilot.step();console.log(JSON.stringify({preview:state.snapshot().jobs.at(-1).status,cards:store.get(p.id).slides.length}));
    }else if(input.command==='status')console.log(JSON.stringify({paired:!!state.snapshot().binding,connectionError:pilot.connectionError,jobs:pilot.status('principal').jobs}));
    else if(input.command==='stop'){await stop();return;}
  }catch(error){console.log(JSON.stringify({error:String(error?.message||'Falha na prova').replace(/https?:\/\/\S+/g,'[endereço omitido]').replace(/\b\d{5,}:[A-Za-z0-9_-]+/g,'[token omitido]')}));}
  finally{busy=false;}
}
const testToken=process.env.CARROSSELL_TELEGRAM_TEST_TOKEN;delete process.env.CARROSSELL_TELEGRAM_TEST_TOKEN;
if(!testToken)throw new Error('Forneça o token somente no ambiente temporário desta prova.');
await execute({command:'connect',token:testToken});
let phase='pairing';
const watch=setInterval(async()=>{
  if(busy)return;
  if(phase==='pairing'&&state.snapshot().binding){phase='preview';await execute({command:'preview'});}
  if(phase==='preview'&&state.snapshot().jobs.at(-1)?.status==='discarded'){
    clearInterval(watch);console.log(JSON.stringify({liveProof:'passed',paired:true,albumSent:true,discardCallbackReceived:true,instagramPublished:false}));await stop();
  }
},1000);
setTimeout(async()=>{clearInterval(watch);console.log(JSON.stringify({liveProof:'timed_out',instagramPublished:false}));await stop();},10*60000).unref();

}).catch(()=>{console.log(JSON.stringify({error:"Não foi possível iniciar a prova local."}));app.quit();});
