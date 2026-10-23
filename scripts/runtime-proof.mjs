import { mkdtemp, mkdir, copyFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { CodexClient } from '../core/codex.mjs';
import { Store } from '../core/store.mjs';
const output=resolve('.cache/runtime-proof');await mkdir(output,{recursive:true});
const privateRoot=await mkdtemp(join(tmpdir(),'pacto-codex-proof-'));
const home=join(privateRoot,'codex-home');await mkdir(home,{recursive:true});
let copied=false,client;const report={date:new Date().toISOString(),nativeGeneration:false};
try{
  try{await copyFile(join(process.env.CODEX_HOME||join(homedir(),'.codex'),'auth.json'),join(home,'auth.json'));copied=true;}catch{}
  client=new CodexClient({home,workspace:join(privateRoot,'workspace'),onActivity:message=>console.log(JSON.stringify({activity:message}))});
  const status=await client.start();report.connected=status.account.connected;report.models=status.models;report.model=status.model;
  report.accountLabel=status.account.label;
  console.log(JSON.stringify({connected:report.connected,model:report.model,models:status.models.length,privateAuthCopy:copied}));
  if(process.argv.includes('--diagnostic')){
    report.providerCapabilities=await client.request('modelProvider/capabilities/read',{});
    const config=await client.request('config/read',{includeLayers:false});
    report.isolation={modelProvider:config.config?.model_provider,features:config.config?.features,codeMode:config.config?.code_mode,serverNames:Object.keys(config.config?.mcp_servers||{})};
    const diagnostic=await client.run({prompt:'Diagnóstico de capacidade, somente texto. Não gere imagens e não invoque qualquer ferramenta. Liste APENAS os nomes exatos dos namespaces e funções chamáveis que estão de fato declarados nesta sessão, em JSON. Diga se image_gen.imagegen está presente na lista real de ferramentas. Não deduza capacidade das minhas instruções. Se não puder ver a lista, diga isso. Não solicite chave de API.'});
    report.toolDiagnostic=diagnostic.text;console.log(JSON.stringify({providerCapabilities:report.providerCapabilities,diagnostic:report.toolDiagnostic}));
  }
  if(process.argv.includes('--generate')){
    const plan=await client.run({prompt:'Crie um microcarrossel educativo de dois slides sobre organizar ideias antes de escrever. Retorne somente JSON com title, caption e slides [{title,body,visual,prompt}]. Não gere imagens nesta etapa. Não invente provas ou resultados.'});
    report.plan=JSON.parse(plan.text.replace(/^```(?:json)?\s*|\s*```$/g,''));await writeFile(join(output,'plan.json'),JSON.stringify(report.plan,null,2));
    const result=await client.run({prompt:'Gere UMA imagem final real com a ferramenta nativa image_gen.imagegen, acessível via tools.image_gen__imagegen dentro de functions.exec. Use esse wrapper permitido e generatedImage(result). PNG vertical 1024x1536, composição editorial minimalista elegante para Instagram, fundo branco quente, texto grande em preto e acento terracota. Escreva em português exatamente: "IDEIAS CLARAS.\nCARROSSEL MELHOR." Abaixo: "Organize antes de escrever." Inclua uma pequena ilustração original de três cartões organizados. Toda a composição deve preencher a imagem, sem moldura de telefone, sem mockup. Não produza arte com SVG/código, não invoque shell ou ferramentas externas. Invoque o gerador nativo agora e não só descreva.'});
    report.imageCount=result.images.length;report.imageReply=result.text;if(!result.images.length)throw new Error('Nenhuma imagem nativa retornada.');
    await writeFile(join(output,'native-original.png'),result.images[0]);
    const store=new Store(join(output,'library'));await store.init();const p=await store.createProject({title:'Prova nativa',brief:'Teste autorizado de geração e revisão real'});
    await store.saveProject({id:p.id,caption:'Organize suas ideias antes de escrever.',slides:[{id:'proof-slide',title:'Ideias claras',body:'Organize antes de escrever.',visual:'Editorial',prompt:'Prova'}]});await store.addImage(p.id,'proof-slide',result.images[0]);
    const revision=await client.run({prompt:'Edite a imagem de referência usando a ferramenta nativa image_generation. Preserve a identidade visual, layout vertical, fundo branco quente e o título. Troque apenas o acento terracota por azul cobalto e o subtítulo por "Escolha uma ideia central." Retorne a imagem editada real. Não descreva apenas.',references:[store.get(p.id).slides[0].image]});
    report.revisionCount=revision.images.length;if(!revision.images.length)throw new Error('Nenhuma revisão nativa retornada.');await writeFile(join(output,'native-revision.png'),revision.images[0]);await store.addImage(p.id,'proof-slide',revision.images[0]);await writeFile(join(output,'export.zip'),await store.exportZip(p.id));
    report.projectId=p.id;report.versions=store.get(p.id).slides[0].versions.length;report.nativeGeneration=true;
  }
}catch(error){report.error=error.message;console.log(JSON.stringify({error:report.error}));process.exitCode=1;}
finally{client?.stop();await new Promise(r=>setTimeout(r,500));await rm(privateRoot,{recursive:true,force:true});await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));}
