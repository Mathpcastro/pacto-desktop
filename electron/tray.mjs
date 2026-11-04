import { Tray, Menu, nativeImage } from 'electron';

// Ícone perto do relógio (Windows): fechar a janela com o piloto ligado deixa o app rodando,
// e é daqui que a pessoa abre de novo, procura atualização ou sai de vez.
export function createTray({icon,show,checkUpdates,quit}){
  const tray=new Tray(nativeImage.createFromPath(icon));
  tray.setToolTip('Carrossell');
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:'Abrir o Carrossell',click:show},
    {label:'Procurar atualização',click:checkUpdates},
    {type:'separator'},
    {label:'Sair do Carrossell',click:quit},
  ]));
  tray.on('click',show);
  return tray;
}
