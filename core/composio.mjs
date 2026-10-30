import { createHash, randomUUID } from 'node:crypto';

// Composio (API REST v3.1) com a chave de API do próprio comprador: conecta o Instagram por OAuth
// gerenciado e executa as ferramentas INSTAGRAM_* direto pela conta conectada (qualquer conta do projeto).
// As imagens sobem para o armazenamento do Composio (files/upload/request) e entram como child_image_files.
export const COMPOSIO_BASE='https://backend.composio.dev/api/v3.1';
export class ComposioError extends Error{constructor(message,{status=0,code=''}={}){super(message);this.status=status;this.code=code;}}
// Mensagens do Composio e da Meta traduzidas para o que a pessoa consegue resolver.
export function friendly(raw,status=0){
  const text=String(raw||'').toLowerCase();
  if(status===401||status===403||/invalid api key|unauthorized|api key/.test(text)){
    // O Composio devolve a chave mascarada (ex.: ak_**3456): mostra para a pessoa conferir qual colou.
    const masked=/invalid api key:\s*(\S+)/i.exec(String(raw||''))?.[1]||'';
    return new ComposioError(`O Composio não aceitou a chave${masked?` (${masked})`:''}. Use a chave do PROJETO: em composio.dev, abra Settings › Project Settings › API Keys. A chave de "AI Clients" (a do MCP) e a chave de usuário (uak_) não servem aqui.`,{status,code:'key'});
  }
  if(status===429||/rate limit|too many/.test(text))return new ComposioError('O Composio pediu uma pausa (muitas chamadas). Tente de novo em alguns minutos.',{status,code:'rate'});
  if(/personal account|not a business|professional account|account type|business or creator/.test(text))return new ComposioError('O Instagram só permite postar por aplicativo em contas Profissionais (Empresa ou Criador de conteúdo). Mude o tipo de conta no Instagram e conecte de novo.',{status,code:'account'});
  if(/expired|invalid oauth|access token|session has been invalidated|reauth|not active|inactive|revoked/.test(text))return new ComposioError('A conexão com o Instagram expirou. Reconecte em Marca › Instagram.',{status,code:'reconnect'});
  if(/content publishing|publishing limit|quota|limit reached|9007/.test(text))return new ComposioError('O Instagram atingiu o limite de posts por API nas últimas 24 horas. Tente mais tarde.',{status,code:'quota'});
  if(/aspect ratio|image format|jpeg|media type|invalid image|could not fetch|download/.test(text))return new ComposioError(`O Instagram recusou uma das imagens: ${String(raw).slice(0,200)}`,{status,code:'image'});
  return new ComposioError(`O Composio respondeu com erro${status?` (${status})`:''}: ${String(raw||'sem detalhes').slice(0,300)}`,{status,code:'other'});
}
// Os dados das ferramentas às vezes vêm como texto JSON, às vezes aninhados em data.
export function toolData(value){
  let v=value;
  for(let i=0;i<3;i++){
    if(typeof v==='string'){try{v=JSON.parse(v);}catch{return v;}}
    else if(v&&typeof v==='object'&&v.data!==undefined&&Object.keys(v).every(k=>['data','successful','error','successfull'].includes(k)))v=v.data;
    else break;
  }
  return v;
}
export function pickId(value,keys=['id']){
  const v=toolData(value);if(typeof v==='string'&&/^\d{5,}$/.test(v))return v;
  for(const key of keys){const x=v?.[key];if(x!==undefined&&x!==null&&String(x))return String(x);}
  return '';
}
export class Composio {
  constructor({apiKey,userId,fetch=globalThis.fetch,base=COMPOSIO_BASE}){
    if(!apiKey)throw new ComposioError('Cole a chave de API do Composio em Marca › Instagram.',{code:'key'});
    this.apiKey=apiKey;this.userId=userId;this.fetch=fetch;this.base=base;
  }
  async call(method,path,body){
    let response;
    try{response=await this.fetch(`${this.base}${path}`,{method,headers:{'x-api-key':this.apiKey,'content-type':'application/json',accept:'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
    catch(error){throw new ComposioError(`Sem conexão com o Composio: ${error.message}`,{code:'network'});}
    const raw=await response.text();let json=null;try{json=raw?JSON.parse(raw):null;}catch{}
    if(!response.ok)throw friendly(json?.error?.message||json?.message||raw,response.status);
    return json??{};
  }
  // Sessão só para criar o link de conexão (OAuth gerenciado). Cada conta nova ganha um usuário próprio,
  // para não esbarrar no limite de uma conta por usuário quando o multi-conta está desligado.
  async session(userId){
    const body={user_id:userId,toolkits:{enable:['instagram']},manage_connections:{enable:false},workbench:{enable:false}};
    const id=(await this.call('POST','/tool_router/session',body)).session_id;if(!id)throw new ComposioError('O Composio não abriu a sessão.');
    return id;
  }
  async link(){
    const userId=`${this.userId}-${randomUUID().slice(0,8)}`;
    const r=await this.call('POST',`/tool_router/session/${await this.session(userId)}/link`,{toolkit:'instagram'});
    if(!r.redirect_url)throw new ComposioError('O Composio não devolveu o link de conexão.');
    return {url:r.redirect_url,accountId:r.connected_account_id,userId};
  }
  // Todas as contas do Instagram já conectadas no projeto do Composio, por qualquer app ou pelo painel.
  async accounts(){
    const out=[];let cursor='';
    for(let page=0;page<5;page++){
      const r=await this.call('GET',`/connected_accounts?toolkit_slugs=instagram&limit=100${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`);
      for(const a of r.items||[])out.push({id:String(a.id),status:String(a.status||'').toUpperCase(),alias:a.alias||a.word_id||'',userId:a.user_id||'',createdAt:a.created_at||''});
      cursor=r.next_cursor||'';if(!cursor)break;
    }
    return out;
  }
  async account(accountId){return this.call('GET',`/connected_accounts/${encodeURIComponent(accountId)}`);}
  async disconnect(accountId){await this.call('DELETE',`/connected_accounts/${encodeURIComponent(accountId)}`);}
  // Execução direta pela conta conectada: vale para contas criadas por qualquer usuário do projeto.
  async execute(accountId,slug,args={},{userId=''}={}){
    const r=await this.call('POST',`/tools/execute/${encodeURIComponent(slug)}`,{connected_account_id:accountId,arguments:args,...(userId?{user_id:userId}:{})});
    if(r.result_type&&r.result_type!=='completed')throw friendly(r.error||r.message||r.result_type);
    if(r.successful===false||(r.error&&!r.data))throw friendly(r.error);
    const data=toolData(r.data);if(data&&typeof data==='object'&&data.error&&!data.id)throw friendly(typeof data.error==='string'?data.error:data.error.message||JSON.stringify(data.error));
    return data;
  }
  // Envia o arquivo ao armazenamento do Composio e devolve a referência aceita em *_files.
  async upload(bytes,{name,mimetype='image/jpeg',tool='INSTAGRAM_CREATE_CAROUSEL_CONTAINER'}){
    const md5=createHash('md5').update(bytes).digest('hex');
    const r=await this.call('POST','/files/upload/request',{toolkit_slug:'instagram',tool_slug:tool,filename:name,mimetype,md5});
    const url=r.new_presigned_url||r.newPresignedUrl;if(!url||!r.key)throw new ComposioError('O Composio não liberou o envio da imagem.');
    const headers={'content-type':mimetype,...(r.metadata?.storage_backend==='azure_blob_storage'?{'x-ms-blob-type':'BlockBlob'}:{})};
    let put;try{put=await this.fetch(url,{method:'PUT',headers,body:bytes});}catch(error){throw new ComposioError(`Não consegui enviar a imagem: ${error.message}`,{code:'network'});}
    if(!put.ok)throw new ComposioError(`O envio da imagem falhou (${put.status}).`,{status:put.status,code:'upload'});
    return {name,mimetype,s3key:r.key};
  }
}
