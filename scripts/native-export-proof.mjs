import { app, nativeImage } from 'electron';
import assert from 'node:assert/strict';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
app.setPath('userData',mkdtempSync(join(tmpdir(),'pacto-export-proof-')));
app.whenReady().then(async()=>{try {
  const { normalizeExport } = await import('../core/export.mjs');
  const original=nativeImage.createFromBitmap(Buffer.from([255,255,255,255]),{width:1,height:1}).toPNG();
  const decoded=nativeImage.createFromBuffer(original);assert.equal(decoded.isEmpty(),false);
  const source=decoded.resize({width:1122,height:1402,quality:'best'}).toPNG();
  const normalized=unzipSync(normalizeExport(zipSync({'01.png':source,'legenda.txt':strToU8('Legenda com acento.')},{level:0}),nativeImage));
  const output=nativeImage.createFromBuffer(Buffer.from(normalized['01.png']));
  assert.deepEqual(output.getSize(),{width:1080,height:1350});assert.equal(strFromU8(normalized['legenda.txt']),'Legenda com acento.');
  assert.deepEqual(nativeImage.createFromBuffer(source).getSize(),{width:1122,height:1402});
  const wrong=decoded.resize({width:1024,height:1536,quality:'best'}).toPNG();
  assert.throws(()=>normalizeExport(zipSync({'01.png':wrong}),nativeImage),/4:5/);
  console.log(JSON.stringify({ok:true,source:{width:1122,height:1402},export:output.getSize(),wrongAspectRejected:true,rawPreserved:true}));
  const inputIndex=process.argv.indexOf('--input'),outputIndex=process.argv.indexOf('--output');
  if(inputIndex>=0&&outputIndex>=0){
    const raw=await readFile(process.argv[inputIndex+1]),zip=normalizeExport(raw,nativeImage),entries=unzipSync(zip);
    const images=Object.entries(entries).filter(([name])=>name.endsWith('.png')).map(([name,bytes])=>({name,...nativeImage.createFromBuffer(Buffer.from(bytes)).getSize()}));
    assert.ok(images.every(i=>i.width===1080&&i.height===1350));await writeFile(process.argv[outputIndex+1],zip);
    console.log(JSON.stringify({actualExport:true,output:process.argv[outputIndex+1],images}));
  }
  app.exit(0);
} catch(error) { console.error(error.message);app.exit(1); }});
