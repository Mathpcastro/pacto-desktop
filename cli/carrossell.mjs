#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectControl, projectSummary, userDataDir } from '../core/control.mjs';
import { TERMS_VERSION, licenseControlStatus } from '../core/license.mjs';
import { cliPersona, parseCommand, ugcFlags, Usage } from './arguments.mjs';
import { IMAGE_LIMIT, findPersona, imageKind, pngDifferenceHash } from '../core/personas.mjs';
import { anchorPrompt, scenePrompt, validateScene } from '../core/ugc.mjs';
import { AGENT_GUIDE } from '../core/agent-guide.mjs';

// CLI do Carrossell para agentes (Codex, Claude Code) e para quem gosta de terminal.
// Fala com o app aberto; se ele estiver fechado, abre o Carrossell sem janela e fala com ele.
// Saída: JSON em stdout; progresso em stderr. Códigos: 0 ok, 1 erro, 2 uso incorreto, 3 app indisponível, 4 tempo esgotado.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const EXIT={ok:0,error:1,usage:2,unavailable:3,timeout:4};

const HELP=`Carrossell CLI — controle o app pelo terminal ou por um agente.

Uso: carrossell <comando> [opções]   (saída em JSON)

  --version, -v, versao          mostra a versão em texto, sem abrir o app
  licenca status                 mostra o estado da licença
  licenca ativar --email <e-mail> --aceito
  skills                         lista as skills de geração disponíveis
  status                         conta ChatGPT, perfil ativo e trabalho em andamento
  perfis                         lista os perfis
  perfil usar <id|nome>          troca o perfil ativo
  perfil criar <nome> [--usar]   cria um perfil
  persona listar [--perfil <id|nome>]
  persona criar --nome <nome> --idade <anos> --genero <gênero> --etnia <aparência>
        --estilo <roupa> --cenario <lugar> --nicho <nicho> --foto <arquivo>
        [--cabelo] [--olhos] [--marca] [--porte] [--instagram @conta] [--usar]
  persona usar <id|nome>         seleciona a persona ativa no perfil
  persona foto <id|nome> --foto <arquivo>
  persona apagar <id|nome>
  persona prompt <id|nome> [--cena "<descrição>" --luz flash|ambiente|pov]
                                 mostra o prompt de âncora ou de cena
  marca                          Contexto da Marca, Design Kit, cores e rascunhos
  marca configurar --link <url> | --descricao "<texto>"
                                 monta Contexto e Design Kit (1 a 3 min) como rascunho
  marca aprovar [--nome <marca>] aprova os rascunhos como a marca do perfil
  pautas [--foco "<tema>"]       gera 30 pautas com o Radar (ou lista as já geradas com --listar)
  projetos                       lista os carrosséis
  projeto <id>                   textos, status e capas de um carrossel
  criar --pauta "<texto>" [--titulo] [--estilo ia|tweet|texto|textopreto|fototexto|fundo|recorte|ugc]
        [--cards 4|6|8|10] [--formato carrossel|material|apresentacao] [--objetivo] [--sem-esperar]
                                 cria o carrossel e escreve o texto
        [--agente claude|gemini] só cria: o texto é escrito pelo seu agente (sem ChatGPT)
  criar --slides <plano.json> [--estilo texto] [--quantas 1-3] [--capa 1-3]
        [--exportar <pasta>]      grava, aprova e monta um carrossel de modelo
                                 padrão: 1 opção, escolhe a primeira; aceita --pauta, --titulo,
                                 --cards, --objetivo, --perfil e --agente
  criar --slides <plano.json> --estilo ugc [--persona <id|nome>] [--foto <capa>]
        [--produto-imagem <arquivo> | --produto-link <http/https>] [--exportar <pasta> [--tiktok]]
                                 usa fotos fornecidas e gera as cenas com a conta ChatGPT conectada
  mensagem <id> "<pedido>"       pede um ajuste no texto, como no chat do estúdio

  Modo agente (Claude, Gemini ou outro agente escreve; o app guarda, monta, exporta e posta):
  marca salvar --contexto <arquivo.md> --design <arquivo.md> [--nome <marca>]
  tarefa <id> texto|cta|stories|arte [--pasta <dir>]
                                 grava o pedido e o esquema JSON que o seu agente deve seguir
  texto <id> --arquivo <json>    grava o texto escrito pelo agente (e aponta sinais de texto de IA)
  cta <id> --arquivo <json>      grava palavras-chave, CTAs e DMs
  stories <id> --arquivo <json>  grava os stories e monta os PNGs em preto ou branco
  card <id> <n> --html <arquivo> | --imagem <arquivo.png>
                                 arte do card n feita pelo agente (HTML 1080×1350 ou PNG)

  Stories, CTA e revisão (qualquer modo):
  stories <id> [--fundo preto|branco]  sem --arquivo, a conta ChatGPT do app escreve os stories
  cta <id>                       sem --arquivo, a conta ChatGPT do app monta palavras-chave, CTAs e DMs
  fundo-stories <id> preto|branco      troca o fundo e refaz os PNGs dos stories
  revisar <id> | --arquivo <texto ou json>
                                 aponta sinais de texto de IA e alertas do método na copy

  editar <id> --json '<campos>'  grava campos do projeto (slides, caption, title...)
  aprovar <id>                   aprova o texto
  capas <id> [--quantas 1-3]     gera as opções de capa
  escolher-capa <id> <n>         escolhe a capa n (1, 2 ou 3)
  gerar <id> [--card <n>]        gera as artes que faltam (ou refaz o card n)
  esperar <id> [--timeout <s>]   espera a geração terminar
  cancelar                       para o trabalho em andamento
  exportar <id> --pasta <dir> [--so-stories | --tiktok]
                                 grava 01.png, 02.png..., legenda e stories. --tiktok inclui tiktok.txt
  instagram                      contas do Instagram e as padrão deste perfil
  instagram contas               busca no Composio as contas já conectadas (sem reconectar)
  instagram conectar             conecta outra conta (abre o navegador)
  instagram padrao @a,@b         contas padrão deste perfil
  postar <id> --confirmar [--contas @a,@b] [--em "2026-11-02 18:00"]
                                 publica agora (ou agenda com --em); sem --contas, nas padrão
  agendados                      posts agendados deste perfil
  cancelar-agendamento <id>      cancela um post agendado
  reagendar <id> --em "AAAA-MM-DD HH:MM"  troca a data de um post agendado
  metricas [<id>]                números do Instagram (atualiza o carrossel indicado)
  posts-instagram [--conta @a] [--limite 25]  posts recentes da conta, para o Replicador
  chamar <ação> [--json '<args>'] qualquer ação do app (veja API.md)
  ajuda [--agente]               esta ajuda ou o guia para agentes

Opções em qualquer comando: --perfil <id|nome>, --timeout <segundos> (padrão 900).`;

const out=value=>process.stdout.write(`${JSON.stringify(value,null,2)}\n`);
const say=text=>process.stderr.write(`${text}\n`);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Abre o app sem janela: empacotado, o próprio executável; em desenvolvimento, o Electron do projeto.
function launchHeadless(){
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const packaged=basename(root).toLowerCase()==='app.asar';
  const [command,args]=packaged?[process.execPath,['--segundo-plano']]:[createRequire(import.meta.url)('electron'),[root,'--segundo-plano']];
  const child=spawn(command,args,{detached:true,stdio:'ignore',windowsHide:true,env});
  return new Promise((ready,reject)=>{child.once('error',reject);child.once('spawn',()=>{child.unref();ready();});});
}
async function connect(userData,{start=true}={}){
  try{return await connectControl(userData);}catch(error){if(!start)throw error;}
  say('Abrindo o Carrossell em segundo plano…');
  try{await launchHeadless();}catch{throw Object.assign(new Error('Não consegui abrir o Carrossell. Abra o app e tente de novo.'),{code:EXIT.unavailable});}
  for(let i=0;i<60;i++){await sleep(1000);try{return await connectControl(userData);}catch{}}
  const error=new Error('O Carrossell não abriu. Abra o app uma vez e tente de novo.');error.code=EXIT.unavailable;throw error;
}
async function resolveProfile(client,value){
  if(value===undefined||value===true)return undefined;
  const {profiles}=await client.call('profiles');const v=String(value).trim().toLowerCase();
  // id, nome exato, começo do nome ou parte do nome — nesta ordem; parte ambígua pede o nome inteiro.
  const name=p=>p.name.toLowerCase();
  const exact=profiles.find(p=>p.id===value)||profiles.find(p=>name(p)===v);if(exact)return exact.id;
  for(const match of [p=>name(p).startsWith(v),p=>name(p).includes(v)]){const found=profiles.filter(match);if(found.length===1)return found[0].id;if(found.length>1)throw new Usage(`Mais de um perfil combina com "${value}": ${found.map(p=>p.name).join(', ')}`);}
  throw new Usage(`Perfil não encontrado: ${value}. Perfis: ${profiles.map(p=>p.name).join(', ')}`);
}
// Espera o projeto sair de planning/generating, mostrando o progresso do app em stderr.
async function showProgress(client){
  let last='';
  await client.subscribe(e=>{if(e.type==='activity'&&e.message&&e.message!==last)say(`… ${last=e.message}`);});
}
async function waitFor(client,profileId,id,seconds,{progress=true}={}){
  const deadline=Date.now()+seconds*1000;
  if(progress)await showProgress(client);
  for(;;){
    const p=await client.call('project',{profileId,id});
    const status=await client.call('status',{profileId});
    if(!['planning','generating'].includes(p.status)&&status.job?.projectId!==id)return p;
    if(Date.now()>deadline){const error=new Error(`Tempo esgotado esperando o projeto ${id} (status ${p.status}).`);error.code=EXIT.timeout;throw error;}
    await sleep(2000);
  }
}
// Contas do Instagram por @ (ou id), separadas por vírgula; vazio usa as padrão do perfil.
async function resolveAccounts(client,profileId,value){
  if(value===undefined||value===true)return undefined;
  const {accounts}=await client.call('instagramStatus',profileId?{profileId}:{});
  return String(value).split(',').map(v=>v.trim().replace(/^@/,'').toLowerCase()).filter(Boolean).map(v=>{const a=accounts.find(a=>a.status==='ACTIVE'&&(a.id===v||a.username.toLowerCase()===v));if(!a)throw new Usage(`Conta do Instagram não encontrada: @${v}. Contas: ${accounts.filter(a=>a.status==='ACTIVE').map(a=>'@'+a.username).join(', ')||'nenhuma (carrossell instagram contas)'}`);return a.id;});
}
const json=(value,what)=>{try{return JSON.parse(String(value).replace(/^﻿/,'').replace(/^```(?:json)?\s*|\s*```\s*$/g,''));}catch{throw new Usage(`${what} precisa ser JSON válido.`);}};
const readText=async file=>{try{return await readFile(resolve(String(file)),'utf8');}catch{throw new Usage(`Não consegui ler o arquivo ${file}.`);}};

const readPlan = async file => json(await readText(file),'O arquivo');
async function readImage(file){
  try{return (await readFile(resolve(file))).toString('base64');}
  catch{throw new Usage(`Não consegui ler o arquivo ${file}.`);}
}
async function readUgcImage(path,{anchor=false}={}){
  const file=await open(path,'r').catch(()=>{throw new Usage(`Não consegui ler o arquivo ${path}.`);});
  try{
    const stats=await file.stat(),{size}=stats;
    if(size>IMAGE_LIMIT)throw new Usage(`Use uma imagem de até 15 MB: ${path}.`);
    if(!size||!stats.isFile())throw new Usage(`Informe um arquivo de imagem válido: ${path}.`);
    const buffer=Buffer.alloc(size+1);
    let offset=0;
    while(offset<buffer.length){
      const {bytesRead}=await file.read(buffer,offset,buffer.length-offset,offset);
      if(!bytesRead)break;
      offset+=bytesRead;
    }
    if(offset!==size)throw new Usage(`A imagem mudou durante a leitura: ${path}.`);
    const bytes=buffer.subarray(0,size),kind=imageKind(bytes);
    if(!kind)throw new Usage(`Use um PNG, JPEG ou WebP válido: ${path}.`);
    if(anchor&&kind==='png'){
      try{pngDifferenceHash(bytes);}catch(error){throw new Usage(error.message);}
    }
    return `data:image/${kind};base64,${bytes.toString('base64')}`;
  }catch(error){
    if(error instanceof Usage)throw error;
    throw new Usage(`Não consegui ler o arquivo ${path}.`);
  }finally{await file.close();}
}

async function prepareUgcPlan(plan,flags){
  const persona=flags.persona??plan.persona??'';
  if(typeof persona!=='string'||(plan.persona!==undefined&&!persona.trim()))throw new Usage('Informe a persona pelo nome ou ID.');
  const photos=[];
  const base=dirname(resolve(flags.slides));
  if(plan.slides.length>20)throw new Usage('Use até vinte slides no plano UGC.');
  const slides=[];
  for(const [index,raw] of plan.slides.entries()){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.title!=='string'||!raw.title.trim()){
      throw new Usage(`Informe o título do slide ${index+1} no plano UGC.`);
    }
    const {foto,photo,produto,...slide}=raw;
    if(produto!==undefined&&typeof produto!=='boolean')throw new Usage(`Use true ou false em produto no slide ${index+1}.`);
    if(index===0&&(produto||slide.product))throw new Usage('Reserve o produto para depois do slide 1 de UGC.');
    if(index===0&&raw.title.trim().split(/\s+/).length>12)throw new Usage('Use até 12 palavras no gancho do slide 1 de UGC.');
    if(slide.scene!==undefined){
      try{slide.scene=validateScene(slide.scene);}catch(error){throw new Usage(error.message);}
    }
    const location=index===0&&flags.foto?flags.foto:foto??photo;
    if(location!==undefined&&location!==''){
      if(typeof location!=='string'||!location.trim())throw new Usage(`Informe o caminho da foto no slide ${index+1}.`);
      const path=index===0&&flags.foto?folderPath(location):resolve(base,location);
      photos.push({index,photo:await readUgcImage(path)});
    }
    slides.push({...slide,...(produto===true?{product:true}:{})});
  }
  const productLink=flags['produto-link']||'';
  const productAsset=flags['produto-imagem']?await readUgcImage(folderPath(flags['produto-imagem'])):'';
  if((productLink||productAsset)&&!slides.some((s,i)=>i>0&&(s.product||/^(?:produto|tela do produto)/i.test(s.role)))){
    if(slides.length<2)throw new Usage('Inclua um card para a imagem do produto no plano UGC.');
    slides[Math.max(1,slides.length-2)].product=true;
  }
  return {plan:{title:'',architecture:'',caption:'',...plan,slides},photos,persona,productLink,productAsset};
}
const signals = tells => {
  if(tells?.length)say(`Sinais de texto de IA para corrigir: ${tells.map(t=>`${t.where}: ${t.label} ("${t.match}")`).join(' · ')}`);
};
const folderPath = value => resolve(/^~[/\\]/.test(value) ? join(homedir(),value.slice(2)) : value);
function checkProject(project){
  if(project.status==='error'||project.error)throw new Error(project.error||'O Carrossell não conseguiu concluir o projeto.');
  return project;
}

async function createCarousel(client,{profileId,flags,timeout,plan,style,ugc}){
  // Fixa o perfil durante todas as etapas, mesmo se ele for trocado na janela.
  const target=profileId || (await client.call('status')).profileId;
  const call=(action,args)=>client.call(action,{...args,profileId:target});
  const imported=Boolean(flags.slides);
  const planTitle=[plan?.title,plan?.slides?.[0]?.title,plan?.slides?.[0]?.body].find(value=>typeof value==='string'&&value.trim())?.trim();
  const brief=flags.pauta||flags.titulo||planTitle||'Carrossel do plano';
  const title=flags.titulo||planTitle?.slice(0,200)||brief.slice(0,80);
  const p=await call('createProject',{
    title,brief,style,
    cardCount:flags.cards===undefined?undefined:Number(flags.cards),format:flags.formato,goal:flags.objetivo,
    madeBy:flags.agente===true?'agente':flags.agente||(imported?'agente':undefined),
    ...(ugc?{persona:ugc.persona,productAsset:ugc.productAsset,productLink:ugc.productLink,ugcOfflineAnchor:true}:{}),
  });
  const id=p.id;
  let files=[];
  try{
    if(!imported){
      if(flags.agente){
        say(`Projeto ${id} criado. Próximo passo: carrossell tarefa ${id} texto`);
        return await call('project',{id});
      }
      say(`Projeto ${id} criado. Escrevendo o texto…`);
      const background=Boolean(flags['sem-esperar']);
      const started=await call('generatePlan',background?{id,discardEmptyOnFailure:true}:{id});
      if(background)return projectSummary(started);
      return checkProject(await waitFor(client,target,id,timeout));
    }
    const { tells,project }=await call('agentSave',{id,kind:'texto',data:flags.titulo?{...plan,title}:plan});
    signals(tells);
    // Uma foto por mensagem mantém todos os arquivos dentro do limite do socket local.
    for(const {index,photo} of ugc?.photos||[]){
      await call('saveUgcSlidePhoto',{id,slideId:project.slides[index].id,photo});
    }
    await call('approveText',{id});
    await showProgress(client);
    await call('generateCovers',{id,count:Number(flags.quantas||1)});
    const covers=checkProject(await waitFor(client,target,id,timeout,{progress:false}));
    const n=Number(flags.capa||1),option=covers.coverOptions.find(item=>item.n===n);
    if(!option)throw new Error(`A opção de capa ${n} não ficou pronta.`);
    await call('chooseCover',{id,optionId:option.id});
    const completed=checkProject(await waitFor(client,target,id,timeout,{progress:false}));
    if(completed.status!=='complete'||!completed.slides.every(s=>s.image))throw new Error('As artes do carrossel não ficaram prontas.');
    if(flags.exportar){
      const result=await call('exportTo',{id,folder:folderPath(flags.exportar),reportPartial:true,...(flags.tiktok?{tiktok:true}:{})});
      files=result.files;
      if(result.error)throw new Error(result.error);
    }
    return {id,estilo:completed.style,cards:completed.slides.length,capa:n,arquivos:files,alertas:tells||[]};
  }catch(error){
    if(files.length){
      error.details={id,arquivos:files};
      error.message+=` Projeto ${id} preservado com ${files.length} arquivo(s) exportado(s).`;
    }else{
      try{
        if(await call('discardCliProject',{id,keepText:!imported}))error.message+=` Projeto ${id} apagado.`;
        else error.message+=` Projeto ${id} preservado com o texto gravado.`;
      }catch{
        error.message+=` Não consegui apagar o projeto ${id}.`;
      }
    }
    throw error;
  }
}

export async function main(argv=process.argv.slice(2),{userData=userDataDir(),connectApp=connect}={}){
  const {cmd,rest,flags}=parseCommand(argv);
  if(cmd==='ajuda'){process.stdout.write(`${flags.agente?AGENT_GUIDE:HELP}\n`);return EXIT.ok;}
  if(cmd==='versao'){
    const {version}=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
    process.stdout.write(`Carrossell ${version}\n`);
    return EXIT.ok;
  }
  let plan=flags.slides?await readPlan(flags.slides):null;
  if(flags.slides&&(!Array.isArray(plan?.slides)||!plan.slides.length))throw new Usage('O plano precisa conter pelo menos um card em slides.');
  const style=flags.estilo||(flags.slides?(plan.estilo==='ugc'?'ugc':'texto'):undefined);
  if(cmd==='criar'&&style!=='ugc'&&ugcFlags.some(key=>flags[key])) throw new Usage('Use opções de persona, produto e foto com o estilo ugc.');
  const ugc=flags.slides&&style==='ugc'?await prepareUgcPlan(plan,flags):null;
  if(ugc)plan=ugc.plan;
  const personaPhoto=cmd==='persona'&&flags.foto?await readUgcImage(folderPath(flags.foto),{anchor:true}):'';
  const data=flags.json?json(flags.json,'--json'):null;
  if(flags.json&&(!data||typeof data!=='object'||Array.isArray(data)))throw new Usage('--json precisa conter um objeto.');
  let response;
  if(flags.arquivo)response=cmd==='revisar'?await readText(flags.arquivo):await readPlan(flags.arquivo);
  const brandFiles=flags.contexto?{context:await readText(flags.contexto),design:await readText(flags.design)}:null;
  const art=flags.html?{html:await readText(flags.html)}:flags.imagem?{png:await readImage(flags.imagem)}:null;
  const client=await connectApp(userData);
  try{
    const profileId=await resolveProfile(client,flags.perfil);
    const scoped=(args={})=>profileId?{...args,profileId}:args;
    const timeout=Number(flags.timeout||900);
    const after=async(id,started)=>flags['sem-esperar']?started:waitFor(client,profileId,id,timeout);
    switch(cmd){
      case 'status':out(await client.call('status',scoped()));break;
      case 'perfis':out(await client.call('profiles'));break;
      case 'perfil':{
        const [sub,...name]=rest;
        if(sub==='usar'){const id=await resolveProfile(client,name.join(' '));const s=await client.call('switchProfile',{id});out({active:s.profileId,profiles:s.profiles});}
        else if(sub==='criar'){const s=await client.call('createProfile',{name:name.join(' '),activate:Boolean(flags.usar)});out({created:s.createdProfile||s.profiles.at(-1),active:s.profileId});}
        break;
      }
      case 'persona':{
        const [sub,...selector]=rest,id=selector.join(' ');
        if(sub==='listar')out(await client.call('personas',scoped()));
        else if(sub==='criar')out(await client.call('savePersona',scoped({persona:{...cliPersona(flags),anchor:personaPhoto},use:Boolean(flags.usar)})));
        else if(sub==='usar')out(await client.call('usePersona',scoped({id})));
        else if(sub==='apagar')out(await client.call('deletePersona',scoped({id})));
        else if(sub==='foto')out(await client.call('savePersona',scoped({persona:{id,anchor:personaPhoto}})));
        else{
          const snapshot=await client.call('personas',scoped());
          const persona=findPersona(snapshot.personas,id);
          const prompt=flags.cena?scenePrompt(persona,{cena:flags.cena,luz:flags.luz}):anchorPrompt(persona);
          out({prompt,avisos:snapshot.avisos.filter(({a,b})=>a.id===persona.id||b.id===persona.id)});
        }
        break;
      }
      case 'marca':{
        const [sub]=rest;
        if(!sub)out(await client.call('brand',scoped()));
        else if(sub==='configurar'){const input=flags.link||flags.descricao;say('Montando Contexto da Marca e Design Kit (1 a 3 minutos)…');await client.subscribe(e=>e.type==='activity'&&e.message&&say(`… ${e.message}`));await client.call('quickSetup',scoped({input:String(input)}));out((await client.call('brand',scoped())).drafts);}
        else if(sub==='aprovar')out(await client.call('approveBrand',scoped({name:typeof flags.nome==='string'?flags.nome:''})));
        else if(sub==='salvar'){
          out(await client.call('saveBrand',scoped({name:typeof flags.nome==='string'?flags.nome:'',...brandFiles})));
        }
        break;
      }
      case 'pautas':{
        if(!flags.listar){say('Gerando pautas com o Radar…');await client.call('radar',scoped(typeof flags.foco==='string'?{focus:flags.foco}:{}));}
        out((await client.call('ideas',scoped())).slice(0,flags.listar?40:1));break;
      }
      case 'projetos':out(await client.call('projects',scoped()));break;
      case 'projeto':out(await client.call('project',scoped({id:rest[0]})));break;
      case 'criar':out(await createCarousel(client,{profileId,flags,timeout,plan,style,ugc}));break;
      case 'skills':out(await client.call('skills'));break;
      case 'licenca':{
        const activation=rest[0]==='ativar';
        const result=licenseControlStatus(await (activation
          ? client.call('activateLicense',{email:flags.email,accepted:true,termsVersion:TERMS_VERSION})
          : client.call('licenseStatus')));
        out(result);
        if(activation&&(!result.activated||result.code&&result.code!=='activated'))return EXIT.error;
        break;
      }
      case 'mensagem':{const id=rest[0];const text=rest.slice(1).join(' ');await client.call('sendMessage',scoped({id,text}));out(await after(id,await client.call('project',scoped({id}))));break;}
      case 'editar':{const id=rest[0];await client.call('saveProject',scoped({...data,id}));out(await client.call('project',scoped({id})));break;}
      case 'aprovar':{const id=rest[0];await client.call('approveText',scoped({id}));out(await client.call('project',scoped({id})));break;}
      case 'capas':{const id=rest[0];await client.call('generateCovers',scoped({id,...(flags.quantas?{count:Number(flags.quantas)}:{})}));out(await after(id,await client.call('project',scoped({id}))));break;}
      case 'escolher-capa':{
        const id=rest[0],n=Number(rest[1]);const p=await client.call('project',scoped({id}));const option=p.coverOptions.find(o=>o.n===n);
        if(!option)throw new Usage(`Escolha uma capa entre ${p.coverOptions.map(o=>o.n).join(', ')||'(gere as capas antes)'}`);
        await client.call('chooseCover',scoped({id,optionId:option.id}));out(await after(id,await client.call('project',scoped({id}))));break;
      }
      case 'gerar':{
        const id=rest[0];const args={id};
        if(flags.card){const p=await client.call('project',scoped({id}));const s=p.slides.find(s=>s.index===Number(flags.card));if(!s)throw new Usage(`Card ${flags.card} não existe.`);args.slideId=s.id;}
        await client.call('generateSlides',scoped(args));out(await after(id,await client.call('project',scoped({id}))));break;
      }
      case 'tarefa':{
        const id=rest[0],kind=rest[1];
        const task=await client.call('agentTask',scoped({id,kind}));
        // O pedido é longo (método e fontes do curso): vai para arquivos que o agente lê, não para a tela.
        const folder=typeof flags.pasta==='string'?resolve(flags.pasta):join(tmpdir(),'carrossell-tarefas',id);await mkdir(folder,{recursive:true});
        const promptFile=join(folder,`tarefa-${kind}.md`);await writeFile(promptFile,task.prompt,'utf8');
        const schemaFile=task.schema?join(folder,`esquema-${kind}.json`):null;if(schemaFile)await writeFile(schemaFile,JSON.stringify(task.schema,null,2),'utf8');
        out({tarefa:kind,pedido:promptFile,esquema:schemaFile,depois:task.next,dica:kind==='arte'?'Leia o pedido e faça um arquivo por card.':'Leia o pedido, escreva a resposta em JSON exatamente no esquema e grave com o comando de "depois".'});break;
      }
      case 'texto':case 'cta':case 'stories':{
        const id=rest[0];
        let r;
        if(typeof flags.arquivo==='string')r=await client.call('agentSave',scoped({id,kind:cmd,data:response}));
        else{
          // Sem arquivo: a conta ChatGPT conectada no app escreve (stories ou kit de CTA e DM), com a mesma voz humana.
          say(cmd==='stories'?'Escrevendo os stories a partir do carrossel…':'Montando palavras-chave, CTAs e DMs…');
          await client.subscribe(e=>e.type==='activity'&&e.message&&say(`… ${e.message}`));
          await client.call(cmd==='stories'?'stories':'ctaKit',scoped({id}));
          r=await client.call('agentResult',scoped({id,kind:cmd}));
        }
        if(cmd==='stories'&&flags.fundo){await client.call('storyTheme',scoped({id,theme:flags.fundo}));r={...r,...await client.call('agentResult',scoped({id,kind:cmd})),tells:r.tells};}
        signals(r.tells);
        out(r);break;
      }
      case 'fundo-stories':{
        const id=rest[0],theme=rest[1];
        await client.call('storyTheme',scoped({id,theme}));out(await client.call('agentResult',scoped({id,kind:'stories'})));break;
      }
      case 'revisar':{
        // Revisão da copy (voz humana e regras do método) de um carrossel do app ou de um arquivo de texto/JSON.
        const args=typeof flags.arquivo==='string'?{text:response}:{id:rest[0]};
        out(await client.call('reviewCopy',scoped(args)));break;
      }
      case 'card':out(await client.call('agentArt',scoped({id:rest[0],card:Number(rest[1]),...art})));break;
      case 'esperar':out(await waitFor(client,profileId,rest[0],timeout));break;
      case 'cancelar':await client.call('cancelWork',scoped());out(await client.call('status',scoped()));break;
      case 'exportar':{const id=rest[0];out(await client.call('exportTo',scoped({id,folder:folderPath(flags.pasta),onlyStories:Boolean(flags['so-stories']),...(flags.tiktok?{tiktok:true}:{})})));break;}
      case 'instagram':{
        if(rest[0]==='conectar'){
          const s=await client.call('connectInstagram',scoped());say(`Autorize no navegador que abriu (ou abra: ${s.url}). Esperando até 10 minutos…`);
          for(let i=0;i<200;i++){await sleep(3000);const c=await client.call('checkInstagram',scoped());if(!c.pending){out(c);return EXIT.ok;}}
          const error=new Error('A conexão não foi concluída em 10 minutos. Rode "carrossell instagram conectar" de novo.');error.code=EXIT.timeout;throw error;
        }
        if(rest[0]==='contas'){out(await client.call('syncInstagram',scoped()));break;}
        if(rest[0]==='padrao'){out(await client.call('setInstagramDefaults',scoped({accounts:await resolveAccounts(client,profileId,rest.slice(1).join(','))})));break;}
        out(await client.call('instagramStatus',scoped()));break;
      }
      case 'postar':{
        const id=rest[0];
        const accounts=await resolveAccounts(client,profileId,flags.contas);
        if(typeof flags.em==='string'){out(await client.call('schedulePost',scoped({id,at:flags.em,accounts})));break;}
        say('Postando no Instagram…');await client.subscribe(e=>e.type==='activity'&&e.message&&say(`… ${e.message}`));
        await client.call('publishInstagram',scoped({id,accounts}));out(await client.call('project',scoped({id})));break;
      }
      case 'agendados':out((await client.call('instagramStatus',scoped())).scheduled);break;
      case 'reagendar':{const id=rest[0];out(await client.call('reschedulePost',scoped({id,at:flags.em})));break;}
      case 'cancelar-agendamento':{const id=rest[0];await client.call('cancelSchedule',scoped({id}));out(await client.call('project',scoped({id})));break;}
      case 'metricas':{
        if(rest[0]){await client.call('refreshMetrics',scoped({id:rest[0]}));out((await client.call('project',scoped({id:rest[0]}))).instagram);break;}
        const list=await client.call('projects',scoped());const all=[];for(const p of list){const d=await client.call('project',scoped({id:p.id}));if(d.instagram.length)all.push({id:d.id,title:d.title,posts:d.instagram});}
        out(all);break;
      }
      case 'posts-instagram':{const [account]=(await resolveAccounts(client,profileId,flags.conta))||[];out(await client.call('instagramPosts',scoped({limit:Number(flags.limite||25),account})));break;}
      case 'chamar':{out(await client.call(rest[0],scoped(data||{})));break;}
      default:throw new Usage(`Comando desconhecido: ${cmd}. Veja "carrossell ajuda".`);
    }
    return EXIT.ok;
  }finally{client.close();}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().then(code=>{process.exitCode=code;},error=>{
    process.stderr.write(`${JSON.stringify({erro:error.message,...error.details})}\n`);
    if(error instanceof Usage)process.stderr.write('Veja "carrossell ajuda".\n');
    process.exitCode=error instanceof Usage?EXIT.usage:error.code===EXIT.timeout||error.code===EXIT.unavailable?error.code:EXIT.error;
  });
}
