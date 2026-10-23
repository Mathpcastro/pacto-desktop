import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { pathToFileURL } from 'node:url';
import { loadKnowledge,getLesson,getSource,searchKnowledge,briefing,prepareCarousel,reviewCarousel } from '../core/knowledge.mjs';

export function createPactoServer(root) {
  const k=loadKnowledge(root);
  const server=new McpServer({name:'pacto',version:'0.1.0'},{instructions:'Método P.A.C.T.O. do curso do usuário. Consulte briefing e método antes de criar. Recursos contêm prompts e regras originais da Biblioteca Oficial. Perfil e identidade do comprador são próprios; não copie as provas pessoais do professor. As ferramentas deste MCP entregam conhecimento e contexto, não geram imagens nem enviam mensagens por si mesmas.'});
  const resource=(name,uri,title,text)=>server.registerResource(name,uri,{title,mimeType:'text/markdown'},async()=>({contents:[{uri,mimeType:'text/markdown',text}]}));
  resource('metodo','pacto://method','Método P.A.C.T.O. operacional',k.method);
  resource('fontes','pacto://sources','Fontes e cobertura',JSON.stringify({manifest:k.manifest,notion:k.pages.map(({id,title,url})=>({id,title,url}))},null,2));
  for(const l of k.lessons)resource(`aula-${l.order}`,`pacto://lesson/${l.id}`,l.title,l.text||'Transcrição não disponível.');
  for(const p of k.pages)resource(`material-${p.id}`,`pacto://notion/${p.id}`,p.title,p.text);
  const result=value=>({content:[{type:'text',text:typeof value==='string'?value:JSON.stringify(value,null,2)}]});
  const annotations={readOnlyHint:true,destructiveHint:false,openWorldHint:false,idempotentHint:true};
  const tool=(name,description,inputSchema,fn)=>server.registerTool(name,{description,inputSchema,annotations},async args=>{
    try{return result(await fn(args));}catch(e){return {isError:true,...result({error:e.message})};}
  });
  const profile=z.record(z.string().max(80),z.unknown());
  tool('pacto_get_method','Ler método, estágios, cinco arquiteturas e proveniência.',{},()=>({method:k.method,data:k.data,coverage:{transcribed:k.manifest.transcribed,total:k.manifest.total,officialPages:k.pages.length},limitations:k.manifest.limitations}));
  tool('pacto_get_lesson','Obter transcrição preservada de uma das oito aulas; inclui idioma e fonte.',{id:z.string().min(1).max(80)},({id})=>getLesson(k,id));
  tool('pacto_get_source','Obter material original do Notion, incluindo seus prompts completos. Use um ID de pacto://sources.',{id:z.string().min(1).max(80)},({id})=>getSource(k,id));
  tool('pacto_search','Buscar passagens do curso e materiais originais com referências.',{query:z.string().min(2).max(400),limit:z.number().int().min(1).max(10).optional()},({query,limit})=>searchKnowledge(k,query,limit));
  tool('pacto_briefing','Entrevistar o comprador e identificar dados ausentes sem inventar informação.',{profile},({profile})=>briefing(profile));
  tool('pacto_prepare_carousel','Preparar contexto e instruções P.A.C.T.O. para o modelo criar um carrossel. Não faz inferência ou gera imagens sozinho.',{profile,brief:z.string().min(1).max(20000),architecture:z.string().max(100).optional()},({profile,brief,architecture})=>prepareCarousel(k,profile,brief,architecture));
  tool('pacto_review_carousel','Revisar estrutura textual do carrossel; não é inspeção visual nem previsão de desempenho.',{slides:z.array(z.object({title:z.string().max(2000),body:z.string().max(10000).optional()})).max(30),caption:z.string().max(10000).optional()},args=>reviewCarousel(args));
  server.registerPrompt('criar-carrossel',{description:'Aplicar o método P.A.C.T.O. a uma pauta, começando pelo contexto do comprador.',argsSchema:{pauta:z.string().min(1).max(20000)}},({pauta})=>({messages:[{role:'user',content:{type:'text',text:`${k.method}\n\nPauta: ${JSON.stringify(pauta)}\n\nConsulte pacto_briefing, peça os dados que faltarem e prepare o roteiro antes das imagens.`}}]}));
  return server;
}

export async function runMcp(root) {
  const server=createPactoServer(root);
  await server.connect(new StdioServerTransport());
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)runMcp().catch(error=>{process.stderr.write(`PACTO MCP: ${error.message}\n`);process.exitCode=1;});
