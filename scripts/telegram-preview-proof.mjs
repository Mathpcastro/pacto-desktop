// Prova da prévia do piloto no Telegram com upload lento (Electron real, para usar o nativeImage).
// Uso: npx electron scripts/telegram-preview-proof.mjs <pasta com 9 PNGs de cards> [KB/s, padrão 250 = 2 Mbps]
// Um Telegram falso local recebe o álbum e só responde depois do tempo que esse upload levaria.
import { app, nativeImage } from 'electron';
import { createServer } from 'node:http';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TelegramClient } from '../core/telegram.mjs';
import { normalizeFiles } from '../core/export.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=join(root,'.cache','telegram-preview-proof');
const [folder,rateArg]=process.argv.slice(2).filter(a=>!a.startsWith('-')&&!a.endsWith('.mjs')&&a!=='.');
const RATE=Number(rateArg)||250;// KB/s
const kb=n=>`${Math.round(n/1024)} KB`,mb=n=>`${(n/1024/1024).toFixed(1)} MB`;

app.whenReady().then(async()=>{
  try{
    if(!folder)throw new Error('Informe a pasta com os PNGs dos cards.');
    const names=(await readdir(folder)).filter(n=>n.endsWith('.png')).slice(0,9);if(names.length<9)throw new Error('A pasta precisa de 9 PNGs.');
    const named=Object.fromEntries(await Promise.all(names.map(async(n,i)=>[`${String(i+1).padStart(2,'0')}.png`,await readFile(join(folder,n))])));
    const pngs=Object.entries(normalizeFiles(named,nativeImage)).map(([name,bytes])=>({name,bytes}));// o que a prévia mandava
    const jpegs=pngs.map(p=>{const image=nativeImage.createFromBuffer(p.bytes);return {name:p.name.replace(/\.png$/,'.jpg'),bytes:image.toJPEG(88)};});// toPreviewJpeg do main.mjs
    const size=list=>list.reduce((n,p)=>n+p.bytes.length,0);
    const check=nativeImage.createFromBuffer(jpegs[0].bytes).getSize();if(check.width!==1080||check.height!==1350)throw new Error(`JPEG com ${check.width}×${check.height}`);
    await mkdir(out,{recursive:true});await writeFile(join(out,'card-01.jpg'),jpegs[0].bytes);await writeFile(join(out,'card-01.png'),pngs[0].bytes);
    console.log(`9 cards 1080×1350: PNG ${mb(size(pngs))} (média ${kb(size(pngs)/9)}) → JPEG ${mb(size(jpegs))} (média ${kb(size(jpegs)/9)})`);

    const server=createServer((req,res)=>{let bytes=0;req.on('data',c=>bytes+=c.length);req.on('end',()=>{
      setTimeout(()=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true,result:Array.from({length:9},(_,i)=>({message_id:i+1}))}));},bytes/(RATE*1024)*1000).unref();
    });});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
    const send=async(label,client,photos)=>{const t=Date.now();try{await client.sendPhotos(1,photos);console.log(`✔ ${label}: chegou em ${((Date.now()-t)/1000).toFixed(1)} s`);return true;}catch(e){console.log(`✘ ${label}: ${e.message} depois de ${((Date.now()-t)/1000).toFixed(1)} s`);return false;}};
    console.log(`Upload simulado a ${RATE} KB/s (${(RATE*8/1000).toFixed(1)} Mbps). Limite antigo: 40 s fixos.`);
    const before=new TelegramClient({token:'1:proof',base});before.uploadTimeout=()=>40000;
    const after=new TelegramClient({token:'1:proof',base});
    const oldFails=!await send('Antes (PNG, 40 s fixos)',before,pngs);
    console.log(`  limite novo para esse mesmo álbum PNG: ${(after.uploadTimeout(size(pngs))/1000).toFixed(0)} s`);
    const newOk=await send(`Depois (JPEG, limite de ${(after.uploadTimeout(size(jpegs))/1000).toFixed(0)} s)`,after,jpegs);
    server.close();
    if(!newOk)throw new Error('A prévia em JPEG não chegou.');
    console.log(oldFails?'Resultado: o envio antigo estoura nessa velocidade e o novo chega.':'Aviso: nessa velocidade o envio antigo também chegaria; use uma velocidade menor para reproduzir o erro.');
    app.exit(0);
  }catch(error){console.error('FALHOU:',error.message);app.exit(1);}
});
