#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectControl, userDataDir } from '../core/control.mjs';
import { AGENT_GUIDE } from '../core/agent-guide.mjs';

// CLI do Carrossell para agentes (Codex, Claude Code) e para quem gosta de terminal.
// Fala com o app aberto; se ele estiver fechado, abre o Carrossell sem janela e fala com ele.
// Saída: JSON em stdout; progresso em stderr. Códigos: 0 ok, 1 erro, 2 uso incorreto, 3 app indisponível, 4 tempo esgotado.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const EXIT={ok:0,error:1,usage:2,unavailable:3,timeout:4};
class Usage extends Error{}
const HELP=`Carrossell CLI — controle o app pelo terminal ou por um agente.

Uso: carrossell <comando> [opções]   (saída em JSON)

  status                         conta ChatGPT, perfil ativo e trabalho em andamento
  perfis                         lista os perfis
  perfil usar <id|nome>          troca o perfil ativo
  perfil criar <nome> [--usar]   cria um perfil
  marca                          Contexto da Marca, Design Kit, cores e rascunhos
  marca configurar --link <url> | --descricao "<texto>"
                                 monta Contexto e Design Kit (1 a 3 min) como rascunho
  marca aprovar [--nome <marca>] aprova os rascunhos como a marca do perfil
  pautas [--foco "<tema>"]       gera 30 pautas com o Radar (ou lista as já geradas com --listar)
  projetos                       lista os carrosséis
  projeto <id>                   textos, status e capas de um carrossel
  criar --pauta "<texto>" [--titulo] [--estilo ia|tweet|texto|textopreto|fototexto|fundo|recorte]
        [--cards 4|6|8|10] [--formato carrossel|material|apresentacao] [--objetivo] [--sem-esperar]
                                 cria o carrossel e escreve o texto
        [--agente claude|gemini] só cria: o texto é escrito pelo seu agente (sem ChatGPT)
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
  exportar <id> --pasta <dir> [--so-stories]
                                 grava 01.png, 02.png..., legenda e stories (ou só os stories)
  instagram                      contas do Instagram e as padrão deste perfil
  instagram contas               busca no Composio as contas já conectadas (sem reconectar)
  instagram conectar             conecta outra conta (abre o navegador)
  instagram padrao @a,@b         contas padrão deste perfil
  postar <id> --confirmar [--contas @a,@b] [--em "2026-11-02 18:00"]
                                 publica agora (ou agenda com --em); sem --contas, nas padrão
  agendados                      posts agendados deste perfil
  cancelar-agendamento <id>      cancela um post agendado
  metricas [<id>]                números do Instagram (atualiza o carrossel indicado)
  posts-instagram [--conta @a] [--limite 25]  posts recentes da conta, para o Replicador
  chamar <ação> [--json '<args>'] qualquer ação do app (veja API.md)
  ajuda [--agente]               esta ajuda ou o guia para agentes

Opções em qualquer comando: --perfil <id|nome>, --timeout <segundos> (padrão 900).`;

function parse(argv){
  const positional=[],flags={};
  for(let i=0;i<argv.length;i++){
    const a=argv[i];
    if(a.startsWith('--')){const [k,v]=a.slice(2).split(/=(.*)/s);const next=argv[i+1];if(v!==undefined)flags[k]=v;else if(next!==undefined&&!next.startsWith('--'))flags[k]=(i++,next);else flags[k]=true;}
    else positional.push(a);
  }
  return {positional,flags};
}
const out=value=>process.stdout.write(`${JSON.stringify(value,null,2)}\n`);
const say=text=>process.stderr.write(`${text}\n`);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Abre o app sem janela: empacotado, o próprio executável; em desenvolvimento, o Electron do projeto.
function launchHeadless(){
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const packaged=basename(root).toLowerCase()==='app.asar';
  const [command,args]=packaged?[process.execPath,['--segundo-plano']]:[createRequire(import.meta.url)('electron'),[root,'--segundo-plano']];
  spawn(command,args,{detached:true,stdio:'ignore',windowsHide:true,env}).unref();
}
async function connect(userData,{start=true}={}){
  try{return await connectControl(userData);}catch(error){if(!start)throw error;}
  say('Abrindo o Carrossell em segundo plano…');launchHeadless();
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
async function waitFor(client,profileId,id,seconds){
  const deadline=Date.now()+seconds*1000;let last='';
  await client.subscribe(e=>{if(e.type==='activity'&&e.message&&e.message!==last)say(`… ${last=e.message}`);});
  for(;;){
    const p=await client.call('project',{profileId,id});
    const status=await client.call('status',{profileId});
    if(!['planning','generating'].includes(p.status)&&status.job?.projectId!==id)return p;
    if(Date.now()>deadline){const error=new Error(`Tempo esgotado esperando o projeto ${id} (status ${p.status}). Use "carrossell esperar ${id}".`);error.code=EXIT.timeout;throw error;}
    await sleep(2000);
  }
}
// Contas do Instagram por @ (ou id), separadas por vírgula; vazio usa as padrão do perfil.
async function resolveAccounts(client,profileId,value){
  if(value===undefined||value===true)return undefined;
  const {accounts}=await client.call('instagramStatus',profileId?{profileId}:{});
  return String(value).split(',').map(v=>v.trim().replace(/^@/,'').toLowerCase()).filter(Boolean).map(v=>{const a=accounts.find(a=>a.status==='ACTIVE'&&(a.id===v||a.username.toLowerCase()===v));if(!a)throw new Usage(`Conta do Instagram não encontrada: @${v}. Contas: ${accounts.filter(a=>a.status==='ACTIVE').map(a=>'@'+a.username).join(', ')||'nenhuma (carrossell instagram contas)'}`);return a.id;});
}
const needId=(id,cmd)=>{if(!id)throw new Usage(`Informe o id do projeto: carrossell ${cmd} <id>`);return id;};
const json=(value,what)=>{try{return JSON.parse(String(value).replace(/^﻿/,'').replace(/^```(?:json)?\s*|\s*```\s*$/g,''));}catch{throw new Usage(`${what} precisa ser JSON válido.`);}};
const readText=async file=>{try{return await readFile(resolve(String(file)),'utf8');}catch{throw new Usage(`Não consegui ler o arquivo ${file}.`);}};

export async function main(argv=process.argv.slice(2),{userData=userDataDir()}={}){
  const {positional:[cmd,...rest],flags}=parse(argv);
  if(!cmd||cmd==='ajuda'||cmd==='help'||flags.help){process.stdout.write(`${flags.agente?AGENT_GUIDE:HELP}\n`);return EXIT.ok;}
  const client=await connect(userData);
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
        else if(sub==='criar'){if(!name.length)throw new Usage('Informe o nome: carrossell perfil criar <nome>');const s=await client.call('createProfile',{name:name.join(' '),activate:Boolean(flags.usar)});out({created:s.createdProfile||s.profiles.at(-1),active:s.profileId});}
        else throw new Usage('Use: carrossell perfil usar <id|nome> | carrossell perfil criar <nome>');
        break;
      }
      case 'marca':{
        const [sub]=rest;
        if(!sub)out(await client.call('brand',scoped()));
        else if(sub==='configurar'){const input=flags.link||flags.descricao;if(!input||input===true)throw new Usage('Use --link <url> ou --descricao "<o que você vende>"');say('Montando Contexto da Marca e Design Kit (1 a 3 minutos)…');await client.subscribe(e=>e.type==='activity'&&e.message&&say(`… ${e.message}`));await client.call('quickSetup',scoped({input:String(input)}));out((await client.call('brand',scoped())).drafts);}
        else if(sub==='aprovar')out(await client.call('approveBrand',scoped({name:typeof flags.nome==='string'?flags.nome:''})));
        else if(sub==='salvar'){
          if(typeof flags.contexto!=='string'||typeof flags.design!=='string')throw new Usage('Use: carrossell marca salvar --contexto <arquivo.md> --design <arquivo.md> [--nome <marca>]');
          out(await client.call('saveBrand',scoped({name:typeof flags.nome==='string'?flags.nome:'',context:await readText(flags.contexto),design:await readText(flags.design)})));
        }
        else throw new Usage('Use: carrossell marca [configurar|aprovar|salvar]');
        break;
      }
      case 'pautas':{
        if(!flags.listar){say('Gerando pautas com o Radar…');await client.call('radar',scoped(typeof flags.foco==='string'?{focus:flags.foco}:{}));}
        out((await client.call('ideas',scoped())).slice(0,flags.listar?40:1));break;
      }
      case 'projetos':out(await client.call('projects',scoped()));break;
      case 'projeto':out(await client.call('project',scoped({id:needId(rest[0],'projeto')})));break;
      case 'criar':{
        const brief=flags.pauta;if(!brief||brief===true)throw new Usage('Use: carrossell criar --pauta "<tema>"');
        const args={title:typeof flags.titulo==='string'?flags.titulo:String(brief).slice(0,80),brief:String(brief)};
        if(flags.estilo)args.style=String(flags.estilo);if(flags.cards)args.cardCount=Number(flags.cards);if(flags.formato)args.format=String(flags.formato);if(typeof flags.objetivo==='string')args.goal=flags.objetivo;
        if(flags.agente)args.madeBy=typeof flags.agente==='string'?flags.agente:'agente';
        const p=await client.call('createProject',scoped(args));
        if(flags.agente){say(`Projeto ${p.id} criado. Próximo passo: carrossell tarefa ${p.id} texto`);out(await client.call('project',scoped({id:p.id})));break;}
        say(`Projeto ${p.id} criado. Escrevendo o texto…`);
        await client.call('generatePlan',scoped({id:p.id}));out(await after(p.id,await client.call('project',scoped({id:p.id}))));break;
      }
      case 'mensagem':{const id=needId(rest[0],'mensagem');const text=rest.slice(1).join(' ');if(!text)throw new Usage('Use: carrossell mensagem <id> "<pedido>"');await client.call('sendMessage',scoped({id,text}));out(await after(id,await client.call('project',scoped({id}))));break;}
      case 'editar':{const id=needId(rest[0],'editar');if(typeof flags.json!=='string')throw new Usage("Use: carrossell editar <id> --json '{\"caption\":\"...\"}'");await client.call('saveProject',scoped({...json(flags.json,'--json'),id}));out(await client.call('project',scoped({id})));break;}
      case 'aprovar':{const id=needId(rest[0],'aprovar');await client.call('approveText',scoped({id}));out(await client.call('project',scoped({id})));break;}
      case 'capas':{const id=needId(rest[0],'capas');await client.call('generateCovers',scoped({id,...(flags.quantas?{count:Number(flags.quantas)}:{})}));out(await after(id,await client.call('project',scoped({id}))));break;}
      case 'escolher-capa':{
        const id=needId(rest[0],'escolher-capa'),n=Number(rest[1]);const p=await client.call('project',scoped({id}));const option=p.coverOptions.find(o=>o.n===n);
        if(!option)throw new Usage(`Escolha uma capa entre ${p.coverOptions.map(o=>o.n).join(', ')||'(gere as capas antes)'}`);
        await client.call('chooseCover',scoped({id,optionId:option.id}));out(await after(id,await client.call('project',scoped({id}))));break;
      }
      case 'gerar':{
        const id=needId(rest[0],'gerar');const args={id};
        if(flags.card){const p=await client.call('project',scoped({id}));const s=p.slides.find(s=>s.index===Number(flags.card));if(!s)throw new Usage(`Card ${flags.card} não existe.`);args.slideId=s.id;}
        await client.call('generateSlides',scoped(args));out(await after(id,await client.call('project',scoped({id}))));break;
      }
      case 'tarefa':{
        const id=needId(rest[0],'tarefa'),kind=rest[1];if(!['texto','cta','stories','arte'].includes(kind))throw new Usage('Use: carrossell tarefa <id> texto|cta|stories|arte');
        const task=await client.call('agentTask',scoped({id,kind}));
        // O pedido é longo (método e fontes do curso): vai para arquivos que o agente lê, não para a tela.
        const folder=typeof flags.pasta==='string'?resolve(flags.pasta):join(tmpdir(),'carrossell-tarefas',id);await mkdir(folder,{recursive:true});
        const promptFile=join(folder,`tarefa-${kind}.md`);await writeFile(promptFile,task.prompt,'utf8');
        const schemaFile=task.schema?join(folder,`esquema-${kind}.json`):null;if(schemaFile)await writeFile(schemaFile,JSON.stringify(task.schema,null,2),'utf8');
        out({tarefa:kind,pedido:promptFile,esquema:schemaFile,depois:task.next,dica:kind==='arte'?'Leia o pedido e faça um arquivo por card.':'Leia o pedido, escreva a resposta em JSON exatamente no esquema e grave com o comando de "depois".'});break;
      }
      case 'texto':case 'cta':case 'stories':{
        const id=needId(rest[0],cmd);
        if(flags.fundo!==undefined&&!['preto','branco'].includes(flags.fundo))throw new Usage('Use --fundo preto ou --fundo branco.');
        let r;
        if(typeof flags.arquivo==='string')r=await client.call('agentSave',scoped({id,kind:cmd,data:json(await readText(flags.arquivo),'O arquivo')}));
        else if(cmd==='texto')throw new Usage('Use: carrossell texto <id> --arquivo <resposta.json> (com a conta ChatGPT, o texto sai em "carrossell criar")');
        else{
          // Sem arquivo: a conta ChatGPT conectada no app escreve (stories ou kit de CTA e DM), com a mesma voz humana.
          say(cmd==='stories'?'Escrevendo os stories a partir do carrossel…':'Montando palavras-chave, CTAs e DMs…');
          await client.subscribe(e=>e.type==='activity'&&e.message&&say(`… ${e.message}`));
          await client.call(cmd==='stories'?'stories':'ctaKit',scoped({id}));
          r=await client.call('agentResult',scoped({id,kind:cmd}));
        }
        if(cmd==='stories'&&flags.fundo){await client.call('storyTheme',scoped({id,theme:flags.fundo}));r={...r,...await client.call('agentResult',scoped({id,kind:cmd})),tells:r.tells};}
        if(r.tells?.length)say(`Sinais de texto de IA para corrigir: ${r.tells.map(t=>`${t.where}: ${t.label} ("${t.match}")`).join(' · ')}`);
        out(r);break;
      }
      case 'fundo-stories':{
        const id=needId(rest[0],'fundo-stories'),theme=rest[1];if(!['preto','branco'].includes(theme))throw new Usage('Use: carrossell fundo-stories <id> preto|branco');
        await client.call('storyTheme',scoped({id,theme}));out(await client.call('agentResult',scoped({id,kind:'stories'})));break;
      }
      case 'revisar':{
        // Revisão da copy (voz humana e regras do método) de um carrossel do app ou de um arquivo de texto/JSON.
        const args=typeof flags.arquivo==='string'?{text:await readText(flags.arquivo)}:{id:needId(rest[0],'revisar')};
        out(await client.call('reviewCopy',scoped(args)));break;
      }
      case 'card':{
        const id=needId(rest[0],'card'),n=Number(rest[1]);if(!Number.isInteger(n)||n<1)throw new Usage('Use: carrossell card <id> <n> --html <arquivo> | --imagem <arquivo.png>');
        if(typeof flags.html==='string')out(await client.call('agentArt',scoped({id,card:n,html:await readText(flags.html)})));
        else if(typeof flags.imagem==='string')out(await client.call('agentArt',scoped({id,card:n,png:(await readFile(resolve(flags.imagem))).toString('base64')})));
        else throw new Usage('Use: carrossell card <id> <n> --html <arquivo> | --imagem <arquivo.png>');
        break;
      }
      case 'esperar':out(await waitFor(client,profileId,needId(rest[0],'esperar'),timeout));break;
      case 'cancelar':await client.call('cancelWork',scoped());out(await client.call('status',scoped()));break;
      case 'exportar':{const id=needId(rest[0],'exportar');if(typeof flags.pasta!=='string')throw new Usage('Use: carrossell exportar <id> --pasta <caminho absoluto>');out(await client.call('exportTo',scoped({id,folder:resolve(flags.pasta),onlyStories:Boolean(flags['so-stories'])})));break;}
      case 'instagram':{
        if(rest[0]==='conectar'){
          const s=await client.call('connectInstagram',scoped());say(`Autorize no navegador que abriu (ou abra: ${s.url}). Esperando até 10 minutos…`);
          for(let i=0;i<200;i++){await sleep(3000);const c=await client.call('checkInstagram',scoped());if(!c.pending){out(c);return EXIT.ok;}}
          const error=new Error('A conexão não foi concluída em 10 minutos. Rode "carrossell instagram conectar" de novo.');error.code=EXIT.timeout;throw error;
        }
        if(rest[0]==='contas'){out(await client.call('syncInstagram',scoped()));break;}
        if(rest[0]==='padrao'){if(!rest[1])throw new Usage('Use: carrossell instagram padrao @conta1,@conta2');out(await client.call('setInstagramDefaults',scoped({accounts:await resolveAccounts(client,profileId,rest.slice(1).join(','))})));break;}
        out(await client.call('instagramStatus',scoped()));break;
      }
      case 'postar':{
        const id=needId(rest[0],'postar');
        if(!flags.confirmar)throw new Usage('Postar publica no Instagram para todo mundo ver. Confira o carrossel (carrossell projeto <id>) e repita com --confirmar.');
        const accounts=await resolveAccounts(client,profileId,flags.contas);
        if(typeof flags.em==='string'){out(await client.call('schedulePost',scoped({id,at:flags.em,accounts})));break;}
        say('Postando no Instagram…');await client.subscribe(e=>e.type==='activity'&&e.message&&say(`… ${e.message}`));
        await client.call('publishInstagram',scoped({id,accounts}));out(await client.call('project',scoped({id})));break;
      }
      case 'agendados':out((await client.call('instagramStatus',scoped())).scheduled);break;
      case 'cancelar-agendamento':{const id=needId(rest[0],'cancelar-agendamento');await client.call('cancelSchedule',scoped({id}));out(await client.call('project',scoped({id})));break;}
      case 'metricas':{
        if(rest[0]){await client.call('refreshMetrics',scoped({id:rest[0]}));out((await client.call('project',scoped({id:rest[0]}))).instagram);break;}
        const list=await client.call('projects',scoped());const all=[];for(const p of list){const d=await client.call('project',scoped({id:p.id}));if(d.instagram.length)all.push({id:d.id,title:d.title,posts:d.instagram});}
        out(all);break;
      }
      case 'posts-instagram':{const [account]=(await resolveAccounts(client,profileId,flags.conta))||[];out(await client.call('instagramPosts',scoped({limit:Number(flags.limite||25),account})));break;}
      case 'chamar':{const action=rest[0];if(!action)throw new Usage('Use: carrossell chamar <ação> [--json \'{...}\']');out(await client.call(action,scoped(typeof flags.json==='string'?json(flags.json,'--json'):{})));break;}
      default:throw new Usage(`Comando desconhecido: ${cmd}. Veja "carrossell ajuda".`);
    }
    return EXIT.ok;
  }finally{client.close();}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().then(code=>{process.exitCode=code;},error=>{
    process.stderr.write(`${JSON.stringify({erro:error.message})}\n`);
    if(error instanceof Usage)process.stderr.write('Veja "carrossell ajuda".\n');
    process.exitCode=error instanceof Usage?EXIT.usage:error.code===EXIT.timeout||error.code===EXIT.unavailable?error.code:EXIT.error;
  });
}
