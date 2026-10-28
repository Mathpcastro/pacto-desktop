// Comparação de versões e link do instalador do Mac, sem depender do Electron (testável no Node).
export const RELEASES='https://github.com/Mathpcastro/pacto-releases/releases/latest/download/';
// Compara versões x.y.z; true quando "next" é mais nova que "current".
export function newer(next,current){
  const a=String(next||'').split('.').map(Number),b=String(current||'').split('.').map(Number);
  if(a.length!==3||a.some(n=>!Number.isInteger(n)))return false;
  for(let i=0;i<3;i++){if(a[i]!==(b[i]||0))return a[i]>(b[i]||0);}
  return false;
}
// Instalador do Mac para o chip da pessoa, pelo link fixo da última release.
export const macDownload=(arch,base=RELEASES)=>`${base}Carrossell-Mac-${arch==='arm64'?'AppleSilicon':'Intel'}.dmg`;
