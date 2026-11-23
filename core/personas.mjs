import { inflateSync } from 'node:zlib';
import { z } from 'zod';

const description = z.string({error: 'Informe a descrição em texto.'}).trim()
  .max(300, 'Use até 300 caracteres em cada descrição da persona.');
const optionalDescription = description.default('');
const age = z.number({error:'Informe a idade em anos.'}).int('Informe a idade em anos inteiros.')
  .min(1,'A idade deve estar entre 1 e 120 anos.').max(120,'A idade deve estar entre 1 e 120 anos.');
export const PERSONA_FIELDS = {
  nome: description.min(1, 'Informe o nome.').prefault(''),
  idade: z.preprocess(value => value === null || (typeof value === 'string' && !value.trim()) ? undefined : value, age.optional()),
  genero: optionalDescription, etnia: optionalDescription, cabelo: optionalDescription,
  olhos: optionalDescription, marcaFixa: optionalDescription, porte: optionalDescription,
  estilo: optionalDescription, cenario: optionalDescription, nicho: optionalDescription,
  instagram: z.string({error:'Informe uma conta válida do Instagram.'}).trim().regex(/^(?:@[\w.]{1,30})?$/,'Use @ seguido do nome da conta do Instagram.').default('')
};
const personaSchema = z.object(PERSONA_FIELDS);
const hashSchema = z.string().regex(/^[a-f\d]{16}$/i,'O hash da foto deve conter 16 dígitos hexadecimais.');
export function validatePersona(input) {
  const result = personaSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0].message);
  return result.data;
}

export function findPersona(personas,selector) {
  const key=String(selector??'').trim().toLocaleLowerCase('pt-BR');
  const exact=personas.find(p=>p.id===key);
  if(exact)return exact;
  const matches=personas.filter(p=>p.nome.toLocaleLowerCase('pt-BR')===key);
  if(matches.length>1)throw new Error('Há mais de uma persona com esse nome. Use o ID.');
  if(!matches.length)throw new Error('Persona não encontrada neste perfil.');
  return matches[0];
}

const PNG = Buffer.from([137,80,78,71,13,10,26,10]);
export function imageKind(bytes) {
  if (bytes.subarray(0,8).equals(PNG)) return 'png';
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255 && bytes.at(-2)===255 && bytes.at(-1)===217) return 'jpeg';
  if (bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP' && bytes.length>=16) return 'webp';
  return '';
}
export const IMAGE_LIMIT = 15 * 1024 * 1024;
export function unpackPhoto(url) {
  const match = typeof url==='string' && url.length<=4*Math.ceil(IMAGE_LIMIT/3)+32 && /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(url);
  if (!match) throw new Error('Use uma imagem PNG, JPEG ou WebP de até 15 MB.');
  const bytes = Buffer.from(match[2],'base64');
  if (bytes.length>IMAGE_LIMIT || imageKind(bytes)!==match[1]) throw new Error('Use uma imagem PNG, JPEG ou WebP válida de até 15 MB.');
  return {bytes,kind:match[1]};
}
export function differenceHash(gray) {
  let hash = 0n;
  for (let y=0;y<8;y++) for (let x=0;x<8;x++) {
    const i = y*9+x;
    hash = (hash<<1n) | BigInt(gray[i]>gray[i+1]);
  }
  return hash.toString(16).padStart(16,'0');
}
export const luminance = (r,g,b) => 299*r+587*g+114*b;
function paeth(a,b,c) {
  const p=a+b-c, da=Math.abs(p-a), db=Math.abs(p-b), dc=Math.abs(p-c);
  if(da<=db && da<=dc) return a;
  return db<=dc ? b : c;
}
export function pngDifferenceHash(bytes) {
  const chunks = [];
  let width, height, channels, supported, end=false;
  for (let pos=8;pos+12<=bytes.length;) {
    const n=bytes.readUInt32BE(pos), type=bytes.toString('ascii',pos+4,pos+8), data=pos+8;
    if (data+n+4>bytes.length) break;
    if (type==='IHDR' && pos===8 && n===13) {
      width=bytes.readUInt32BE(data); height=bytes.readUInt32BE(data+4);
      if (!width || !height || width*height>40_000_000) throw new Error('Dimensões da foto inválidas.');
      channels={2:3,6:4}[bytes[data+9]];
      supported=channels && bytes[data+8]===8 && bytes.readUIntBE(data+10,3)===0;
    }
    if (type==='IDAT') chunks.push(bytes.subarray(data,data+n));
    if (type==='IEND' && n===0 && data+4===bytes.length) end=true;
    pos=data+n+4;
  }
  if (!width || !chunks.length || !end) throw new Error('A foto PNG está incompleta.');
  if (!supported) return '';
  const stride=width*channels, length=(stride+1)*height;
  let raw;
  try { raw=inflateSync(Buffer.concat(chunks),{maxOutputLength:length}); }
  catch { throw new Error('Não foi possível ler os pixels da foto PNG.'); }
  if (raw.length!==length) throw new Error('Não foi possível ler os pixels da foto PNG.');
  let previous=Buffer.alloc(stride);
  const gray=new Float64Array(72);
  const range=(size,steps)=>Array.from({length:steps},(_,i)=>{
    const start=Math.floor(i*size/steps);
    return [start,Math.max(start+1,Math.floor((i+1)*size/steps))];
  });
  const columns=range(width,9),rows=range(height,8);
  for (let y=0;y<height;y++) {
    const offset=y*(stride+1), filter=raw[offset], row=raw.subarray(offset+1,offset+1+stride);
    if (filter>4) throw new Error('Filtro PNG inválido na foto.');
    if (filter) for (let i=0;i<stride;i++) {
      const left=i>=channels?row[i-channels]:0, up=previous[i], diagonal=i>=channels?previous[i-channels]:0;
      row[i]+=filter===1?left:filter===2?up:filter===3?(left+up)>>1:paeth(left,up,diagonal);
    }
    for(const [dy,[top,bottom]] of rows.entries()){
      if(y<top||y>=bottom)continue;
      for(const [dx,[left,right]] of columns.entries()){
        let sum=0;
        for(let i=left*channels;i<right*channels;i+=channels)sum+=luminance(row[i],row[i+1],row[i+2]);
        gray[dy*9+dx]+=sum/((right-left)*(bottom-top));
      }
    }
    previous=row;
  }
  return differenceHash(gray);
}
export async function photoHash(anchor, supplied, nativeHash) {
  const {bytes,kind}=unpackPhoto(anchor);
  const hash=(kind==='png' && pngDifferenceHash(bytes)) || supplied || await nativeHash?.(bytes,kind);
  if (!hash) throw new Error('Informe o hash da foto ou abra a imagem no aplicativo Carrossell.');
  const result=hashSchema.safeParse(hash);
  if (!result.success) throw new Error(result.error.issues[0].message);
  return result.data.toLowerCase();
}

const normalized = value => String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
const tokens = value => new Set(normalized(value).filter(word=>!['a','o','de','da','do','e','em','com','um','uma'].includes(word)));
function overlap(a,b) {
  const first=tokens(a), second=tokens(b), union=new Set([...first,...second]);
  return union.size ? [...first].filter(word=>second.has(word)).length/union.size : 0;
}
function closeHash(a,b) {
  if (!hashSchema.safeParse(a).success || !hashSchema.safeParse(b).success) return false;
  let xor=BigInt('0x'+a)^BigInt('0x'+b), distance=0;
  while(xor && distance<=10) { xor &= xor-1n; distance++; }
  return distance<=10;
}
const describe = ({id,nome,profileId,profileName}) => ({id,nome,profileId,profileName});
export function similarPersonas(personas) {
  const pairs=[];
  for (const [i,a] of personas.entries()) for(const b of personas.slice(i+1)) {
    const motivos=[];
    if (a.anchor && b.anchor && closeHash(a.anchorHash,b.anchorHash)) motivos.push('Foto-âncora com rosto possivelmente igual.');
    if (Math.abs(a.idade-b.idade)<=4 && ['genero','etnia'].every(key=>{
      const value=normalized(a[key]).join(' ');
      return value && value===normalized(b[key]).join(' ');
    })) {
      const score=['cabelo','estilo','cenario'].reduce((sum,key)=>sum+overlap(a[key],b[key]),0);
      if(score>=2) motivos.push('Gênero, idade, aparência e descrições visuais semelhantes.');
    }
    if (motivos.length) pairs.push({a:describe(a),b:describe(b),motivo:motivos.join(' ')});
  }
  return pairs;
}
