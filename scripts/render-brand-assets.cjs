// Deterministic native asset generation from the approved geometric SVG.
// Run: electron scripts/render-brand-assets.cjs
const { app, BrowserWindow } = require('electron');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { resolve, join } = require('node:path');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
const root = resolve(__dirname, '..');
const brand = join(root, 'resources', 'branding');
const source = join(root, 'src', 'assets');
const orange = '#FF5A36', graphite = '#191919';
async function main() {
 await mkdir(brand, { recursive: true });
 const mark = await readFile(join(source, 'brand-mark.svg'), 'utf8');
 const paths = mark.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
 const outline = JSON.parse(await readFile(join(brand, 'wordmark-outlines.json'), 'utf8'));
 const wrap = (content, size=1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${content}</svg>`;
 const symbol = (fill) => `<g transform="translate(130 118) scale(6)" fill="${fill}">${paths}</g>`;
 const variants = {
   'icon-orange': wrap(`<rect x="24" y="24" width="976" height="976" rx="218" fill="${orange}"/>${symbol('#FFFFFF')}`),
   'icon-graphite': wrap(`<rect x="24" y="24" width="976" height="976" rx="218" fill="${graphite}"/>${symbol(orange)}`),
   'instagram-avatar-orange': wrap(`<path fill="${orange}" d="M0 0h1024v1024H0z"/>${symbol('#FFFFFF')}`,1080),
   'instagram-avatar-graphite': wrap(`<path fill="${graphite}" d="M0 0h1024v1024H0z"/>${symbol(orange)}`,1080),
 };
 const logoWidth = 148 + outline.width * .052;
 for (const [name, color] of [['light',graphite],['dark','#F6F3ED']]) {
   const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${logoWidth} 140" fill="${orange}"><g transform="translate(0 6)">${paths}</g><g fill="${color}" transform="translate(148 108) scale(.052 -.052)">${outline.paths}</g></svg>`;
   await writeFile(join(brand, `carrossell-logo-${name}.svg`), svg);
   await writeFile(join(source, `brand-lockup-${name}.svg`), svg);
 }
 await writeFile(join(brand, 'carrossell-symbol.svg'), mark);
 await writeFile(join(brand, 'carrossell-symbol-white.svg'), mark.replace('fill="#FF5A36"','fill="#FFFFFF"'));
 const window = new BrowserWindow({width:1080,height:1080,show:false,frame:false,transparent:true,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const rendered={};
 async function raster(svg,width,height) {
   window.setContentSize(width,height);
   await window.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(`<html><head><style>html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}svg{display:block;width:100%;height:100%}</style></head><body>${svg}</body></html>`));
   await window.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
   const image=await window.webContents.capturePage();
   if(image.isEmpty())throw Error('Empty SVG rasterization');
   const actual=image.getSize();if(actual.width!==width||actual.height!==height)throw Error(`Unexpected dimensions ${JSON.stringify(actual)}`);
   return image;
 }
 for(const [name,svg] of Object.entries(variants)) {
   await writeFile(join(brand,`${name}.svg`),svg);
   const size=name.startsWith('instagram')?1080:1024;
   const image=await raster(svg,size,size);rendered[name]=image;
   await writeFile(join(brand,`${name}.png`),image.toPNG());
 }
 for(const name of ['light','dark']){
   const svg=await readFile(join(brand,`carrossell-logo-${name}.svg`),'utf8');
   const image=await raster(svg,Math.round(logoWidth*3),420);
   await writeFile(join(brand,`carrossell-logo-${name}.png`),image.toPNG());
 }
 const sizes=[16,24,32,48,64,128,256,512,1024];
 const pngs=new Map();
 for(const size of sizes){const png=rendered['icon-orange'].resize({width:size,height:size,quality:'best'}).toPNG();pngs.set(size,png);await writeFile(join(brand,`icon-${size}.png`),png);}
 const icoSizes=sizes.filter(s=>s<=256);const header=Buffer.alloc(6);header.writeUInt16LE(1,2);header.writeUInt16LE(icoSizes.length,4);let offset=6+16*icoSizes.length;
 const entries=icoSizes.map(size=>{const b=pngs.get(size);const e=Buffer.alloc(16);e[0]=e[1]=size===256?0:size;e.writeUInt16LE(1,4);e.writeUInt16LE(32,6);e.writeUInt32LE(b.length,8);e.writeUInt32LE(offset,12);offset+=b.length;return e;});
 await writeFile(join(brand,'carrossell.ico'),Buffer.concat([header,...entries,...icoSizes.map(s=>pngs.get(s))]));
 const types={16:'icp4',32:'icp5',64:'icp6',128:'ic07',256:'ic08',512:'ic09',1024:'ic10'};
 const chunks=Object.entries(types).map(([size,type])=>{const data=pngs.get(Number(size));const h=Buffer.alloc(8);h.write(type);h.writeUInt32BE(data.length+8,4);return Buffer.concat([h,data]);});
 const icnsHead=Buffer.alloc(8);icnsHead.write('icns');icnsHead.writeUInt32BE(chunks.reduce((sum,c)=>sum+c.length,8),4);
 await writeFile(join(brand,'carrossell.icns'),Buffer.concat([icnsHead,...chunks]));
 const sheet=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#F6F3ED"/><text x="64" y="67" font-family="Segoe UI" font-size="20" fill="#666">CARROSSELL / IDENTIDADE 02</text><image href="data:image/svg+xml;base64,${Buffer.from(await readFile(join(brand,'carrossell-logo-light.svg'))).toString('base64')}" x="60" y="105" width="530" height="145"/><text x="70" y="300" font-family="Segoe UI" font-size="23" fill="#191919">Carrosséis com estratégia de venda.</text><image href="data:image/png;base64,${rendered['icon-orange'].toPNG().toString('base64')}" x="60" y="375" width="225" height="225"/><image href="data:image/png;base64,${rendered['icon-graphite'].toPNG().toString('base64')}" x="330" y="375" width="225" height="225"/><text x="77" y="644" font-family="Segoe UI" font-size="19" fill="#666">Ícones do aplicativo</text><circle cx="925" cy="272" r="166" fill="${orange}"/><g transform="translate(800 140) scale(2)" fill="white">${paths}</g><text x="782" y="498" font-family="Segoe UI" font-size="23" fill="#191919">Avatar do Instagram</text><text x="780" y="548" font-family="Segoe UI" font-size="19" fill="#666">#FF5A36 · #191919 · #F6F3ED</text></svg>`;
 await writeFile(join(brand,'brand-sheet.svg'),sheet);
 await writeFile(join(brand,'brand-sheet.png'),(await raster(sheet,1280,720)).toPNG());
 window.destroy();console.log(JSON.stringify({generated:true,sizes,icoImages:icoSizes.length,icnsChunks:chunks.length,output:brand}));
}
app.whenReady().then(main).then(()=>app.quit()).catch(e=>{console.error(e);app.exit(1);});
