import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {Store} from '../core/store.mjs';import {Runtime} from '../core/runtime.mjs';import {CodexClient} from '../core/codex.mjs';import {loadKnowledge} from '../core/knowledge.mjs';
if(!process.argv.includes('--real'))throw Error('Use --real para testar com a conta ChatGPT conectada.');
const out=resolve('.cache/visual-references-proof'),dir=await mkdtemp(join(tmpdir(),'carrossell-refs-native-'));let client;
try{
const home=join(dir,'home');await mkdir(home,{recursive:true});await copyFile(join(process.env.APPDATA,'pacto-desktop','codex','auth.json'),join(home,'auth.json'));
client=new CodexClient({home,workspace:join(dir,'workspace'),onActivity:message=>console.log(message)});await client.start();
const store=await new Store(join(dir,'store')).init();const reference=await readFile(join(out,'chart-reference.png'));
await store.saveProfile({brand:'Trading · prova temporária',brandContext:'Marca de educação em trading. Ensina leitura de gráficos, candles, suporte e resistência. Os gráficos devem explicar a ideia do card. Exemplos ilustrativos, sem cotações reais ou lucros.',designKit:'Fundo grafite #111820, verde #39c5a3, vermelho suave #f2676b. Gráficos de candles e linhas de suporte limpos, tipografia sem serifa, texto branco legível.',references:[{name:'Gráfico de suporte · referência ilustrativa',dataUrl:'data:image/png;base64,'+reference.toString('base64')}]});
const p=await store.createProject({title:'Como reconhecer um suporte',brief:'Ensinar região de suporte no gráfico, visual técnico de trading',style:'ia'});
await store.saveProject({id:p.id,slides:[{id:'cover',index:1,role:'Capa',title:'Como reconhecer um suporte',body:'Observe onde o preço reage',visual:'Gráfico de candles com faixa de suporte em verde',prompt:'',emphasis:''},{id:'cta',index:2,role:'CTA',title:'Observe a região',body:'',visual:'Gráfico de candles',prompt:'',emphasis:''}]});
const rt=new Runtime({store,codex:client,knowledge:loadKnowledge(),emit:()=>{}});await rt.covers({id:p.id,cancelled:false},1);
const option=store.get(p.id).coverOptions[0];await writeFile(join(out,'native-trading-cover.png'),Buffer.from(option.image.split(',')[1],'base64'));console.log('CAPA SALVA',join(out,'native-trading-cover.png'));
}finally{client?.stop();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:500});}
