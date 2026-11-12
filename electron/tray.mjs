import { Tray, Menu, nativeImage } from 'electron';
import { translateUi } from '../core/i18n.mjs';

// Ícone perto do relógio (Windows): fechar a janela com o piloto ligado deixa o app rodando,
// e é daqui que a pessoa abre de novo, procura atualização ou sai de vez.
function menu({show,checkUpdates,quit,locale}){
  const t=s=>translateUi(locale,s);
  return Menu.buildFromTemplate([
    {label:t('Abrir o Carrossell'),click:show},
    {label:t('Procurar atualização'),click:checkUpdates},
    {type:'separator'},
    {label:t('Sair do Carrossell'),click:quit},
  ]);
}
export function createTray({icon,show,checkUpdates,quit,locale='pt-BR'}){
  const tray=new Tray(nativeImage.createFromPath(icon));
  tray.setToolTip('Carrossell');
  const apply=next=>{locale=next||locale;tray.setContextMenu(menu({show,checkUpdates,quit,locale}));};
  apply(locale);
  tray.on('click',show);
  tray.setLocale=apply;
  return tray;
}
