import { ComposioError, pickId, toolData } from './composio.mjs';

// Postar o carrossel pronto e ler as métricas pelo Composio. Regras do Instagram: de 2 a 10 imagens
// JPEG, legenda de até 2.200 caracteres e conta Profissional (Empresa ou Criador de conteúdo).
// "account" é uma conta conectada no Composio: {id, igUserId, username, userId}.
export const LIMITS={minCards:2,maxCards:10,caption:2200};
// Depois de postar, as métricas são atualizadas em 1, 3 e 7 dias (e quando a pessoa pede).
export const METRIC_STEPS=[1,3,7].map(days=>days*24*60*60*1000);
const MEDIA_FIELDS='id,permalink,timestamp,like_count,comments_count,saved_count,shares_count,view_count';
const INSIGHTS={reach:'reach',saved:'saves',shares:'shares',views:'views',total_interactions:'interactions'};
const tool=(composio,account)=>(slug,args)=>composio.execute(account.id,slug,args,{userId:account.userId||''});

export function postable(project){
  if(project.format&&project.format!=='carrossel')throw new Error('Só carrosséis podem ser postados no Instagram.');
  const n=project.slides?.length||0;
  if(n<LIMITS.minCards)throw new Error('O Instagram pede pelo menos 2 cards num carrossel.');
  if(n>LIMITS.maxCards)throw new Error(`O Instagram aceita até ${LIMITS.maxCards} cards por carrossel; este tem ${n}. Remova cards antes de postar.`);
  if(project.slides.some(s=>!s.image||['outdated','generating'].includes(s.state)))throw new Error('Gere ou atualize todas as artes antes de postar.');
  if((project.caption||'').length>LIMITS.caption)throw new Error(`A legenda passa de ${LIMITS.caption} caracteres, o limite do Instagram.`);
}
function firstRow(value){const v=toolData(value);if(Array.isArray(v?.data))return v.data[0];if(Array.isArray(v))return v[0];return v;}
const num=value=>value===undefined||value===null||value===''||Number.isNaN(Number(value))?null:Number(value);

export async function accountInfo(composio,account){
  const v=toolData(await tool(composio,account)('INSTAGRAM_GET_USER_INFO',{ig_user_id:'me',fields:'id,user_id,username,account_type,followers_count,media_count'}));
  const igUserId=pickId(v,['user_id','id']);if(!igUserId)throw new ComposioError('O Composio não devolveu o id da conta do Instagram.');
  if(v?.account_type&&!/business|media_creator|creator/i.test(v.account_type))throw Object.assign(new ComposioError('O Instagram só permite postar por aplicativo em contas Profissionais (Empresa ou Criador de conteúdo). Mude o tipo de conta no Instagram e conecte de novo.',{code:'account'}),{username:String(v?.username||'')});
  return {igUserId,username:String(v?.username||''),followers:num(v?.followers_count)};
}

export async function publishCarousel({composio,account,caption='',jpegs,onStep=()=>{},now=()=>Date.now()}){
  const run=tool(composio,account),ig=account.igUserId,at=account.username?` em @${account.username}`:'';
  onStep(`Conferindo o limite de posts${at}…`);
  try{
    const row=firstRow(await run('INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT',{ig_user_id:ig}));
    const usage=num(row?.quota_usage),total=num(row?.config?.quota_total);
    if(total&&usage!==null&&usage>=total)throw new ComposioError('O Instagram atingiu o limite de posts por API nas últimas 24 horas. Tente mais tarde.',{code:'quota'});
  }catch(error){if(['quota','key','reconnect','account'].includes(error.code))throw error;}
  onStep(`Enviando ${jpegs.length} imagens${at}…`);
  const files=[];for(const [i,bytes] of jpegs.entries())files.push(await composio.upload(bytes,{name:`${String(i+1).padStart(2,'0')}.jpg`}));
  onStep(`Montando o carrossel${at}…`);
  const container=await run('INSTAGRAM_CREATE_CAROUSEL_CONTAINER',{ig_user_id:ig,caption,child_image_files:files});
  const creationId=pickId(container,['id','creation_id','container_id']);if(!creationId)throw new ComposioError('O Instagram não devolveu o carrossel montado. Nada foi postado.');
  onStep(`Publicando${at}…`);
  const mediaId=pickId(await run('INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH',{ig_user_id:ig,creation_id:creationId}),['id','media_id']);
  if(!mediaId)throw new ComposioError('O Instagram não confirmou a publicação. Confira o perfil antes de tentar de novo, para não postar duas vezes.',{code:'unconfirmed'});
  let permalink='';try{permalink=String(toolData(await run('INSTAGRAM_GET_IG_MEDIA',{ig_media_id:mediaId,fields:'id,permalink'}))?.permalink||'');}catch{}
  return {accountId:account.id,username:account.username||'',mediaId,permalink,publishedAt:new Date(now()).toISOString()};
}

// Curtidas e comentários saem para qualquer conta Profissional; alcance, salvamentos, compartilhamentos e
// visualizações vêm dos insights, que o Instagram só libera para contas com 1.000 seguidores ou mais.
export async function fetchMetrics(composio,account,mediaId){
  const run=tool(composio,account);let media;
  try{media=toolData(await run('INSTAGRAM_GET_IG_MEDIA',{ig_media_id:mediaId,fields:MEDIA_FIELDS}));}
  catch(error){if(['key','reconnect','rate'].includes(error.code))throw error;media=toolData(await run('INSTAGRAM_GET_IG_MEDIA',{ig_media_id:mediaId,fields:'id,permalink,like_count,comments_count'}));}
  const metrics={likes:num(media?.like_count),comments:num(media?.comments_count),saves:num(media?.saved_count),shares:num(media?.shares_count),views:num(media?.view_count),reach:null,interactions:null};
  let insights='ok';
  try{
    const v=toolData(await run('INSTAGRAM_GET_IG_MEDIA_INSIGHTS',{ig_media_id:mediaId,metric:Object.keys(INSIGHTS)}));
    const rows=Array.isArray(v?.data)?v.data:Array.isArray(v)?v:[];
    for(const row of rows){const key=INSIGHTS[row?.name];const value=num(row?.values?.[0]?.value??row?.total_value?.value);if(key&&value!==null)metrics[key]=value;}
    if(!rows.length)insights='unavailable';
  }catch(error){if(['key','reconnect'].includes(error.code))throw error;insights='unavailable';}
  return {metrics,permalink:String(media?.permalink||''),insights,updatedAt:new Date().toISOString()};
}
// Próxima atualização automática das métricas (1, 3 e 7 dias após postar); depois disso, só sob pedido.
export function nextMetricsAt(publishedAt,now=Date.now()){
  const start=new Date(publishedAt).getTime();if(!start)return '';
  const next=METRIC_STEPS.map(step=>start+step).find(t=>t>now);return next?new Date(next).toISOString():'';
}
export async function recentPosts(composio,account,limit=25){
  const v=toolData(await tool(composio,account)('INSTAGRAM_GET_IG_USER_MEDIA',{ig_user_id:'me',limit,fields:'id,caption,media_type,permalink,timestamp,like_count,comments_count,saved_count,shares_count'}));
  const rows=Array.isArray(v?.data)?v.data:Array.isArray(v)?v:[];
  return rows.map(m=>({id:String(m.id),caption:String(m.caption||'').slice(0,2200),type:m.media_type||'',permalink:m.permalink||'',timestamp:m.timestamp||'',likes:num(m.like_count),comments:num(m.comments_count),saves:num(m.saved_count),shares:num(m.shares_count)}));
}
