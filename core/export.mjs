import { unzipSync, zipSync } from 'fflate';
import { pngBytes } from './store.mjs';

// Normalize only the exported copies. Native originals and revision history stay untouched.
export function normalizeExport(zipBytes,nativeImage){
  const input=unzipSync(zipBytes),output={};let count=0;
  for(const [name,value]of Object.entries(input)){
    if(name==='legenda.txt'){output[name]=value;continue;}
    if(!/^\d{2}\.png$/.test(name))throw new Error('Arquivo não permitido na exportação.');
    const image=nativeImage.createFromBuffer(pngBytes(value));
    if(image.isEmpty())throw new Error(`Não foi possível ler a imagem ${name}.`);
    const {width,height}=image.getSize();
    if(!height||Math.abs(width/height-0.8)>0.02)throw new Error(`O slide ${name.slice(0,2)} precisa estar na proporção 4:5 antes de exportar. Gere esse slide novamente solicitando 4:5.`);
    const bytes=image.resize({width:1080,height:1350,quality:'best'}).toPNG();
    pngBytes(bytes);if(bytes.readUInt32BE(16)!==1080||bytes.readUInt32BE(20)!==1350)throw new Error('A imagem não atingiu o tamanho de exportação.');
    output[name]=bytes;count++;
  }
  if(!count)throw new Error('Não há imagens para exportar.');
  return zipSync(output,{level:0});
}
