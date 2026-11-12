// Idioma do app. pt-BR é o padrão: sem a chave, ou com qualquer outro valor, nada muda.
// es pede espanhol latinoamericano neutro na interface e na copy gerada.
import catalog from './i18n-es.json' with { type: 'json' };

export const LOCALES = ['pt-BR', 'es'];

export function normalizeLocale(value) {
  const v = String(value ?? '').trim().toLowerCase().replaceAll('_', '-');
  if (v === 'es' || v.startsWith('es-')) return 'es';
  return 'pt-BR';
}

export function isSpanish(locale) {
  return normalizeLocale(locale) === 'es';
}

// Datas e números. pt-BR continua exatamente o locale que o app já usava.
export function intlLocale(locale) {
  return isSpanish(locale) ? 'es-419' : 'pt-BR';
}

// Frases com um pedaço variável (título do projeto, contagem). O miolo capturado não é traduzido.
const PATTERNS = [
  [/^(\d+) para revisar$/, (n) => `${n} por revisar`],
  [/^Opcional · (\d+) aulas$/, (n) => `Opcional · ${n} ${n === '1' ? 'clase' : 'clases'}`],
  [/^Opcional · (\d+) aula$/, (n) => `Opcional · ${n} clase`],
  [/^Avisos do Carrossell, (\d+) não lidos$/, (n) => `Avisos de Carrossell, ${n} sin leer`],
  [/^Avisos do Carrossell, (\d+) não lido$/, (n) => `Avisos de Carrossell, ${n} sin leer`],
  [/^Ações para (.+)$/, (name) => `Acciones para ${name}`],
  [/^Abrir (.+)$/, (name) => `Abrir ${name}`],
  [/^Trocar para o perfil (.+)$/, (name) => `Cambiar al perfil ${name}`],
  [/^Trocar a data de (.+)$/, (name) => `Cambiar la fecha de ${name}`],
  [/^Cancelar o agendamento de (.+)$/, (name) => `Cancelar la programación de ${name}`],
  [/^Excluir o perfil (.+)$/, (name) => `Eliminar el perfil ${name}`],
  [/^Perfil: (.+)\. Trocar de perfil$/, (name) => `Perfil: ${name}. Cambiar de perfil`],
  [/^Gerando opção de capa (\d+) de (\d+)…$/, (a, b) => `Generando opción de portada ${a} de ${b}…`],
  [/^Gerando card (\d+) de (\d+)…$/, (a, b) => `Generando tarjeta ${a} de ${b}…`],
  [/^Corrigindo o card (\d+)…$/, (n) => `Corrigiendo la tarjeta ${n}…`],
  [/^Gerando foto (\d+) de (\d+) do ambiente…$/, (a, b) => `Generando foto ${a} de ${b} del ambiente…`],
  [/^Gerando (\d+) fotos do mesmo ambiente…$/, (n) => `Generando ${n} fotos del mismo ambiente…`],
  [/^“(.+)” foi publicado há alguns dias\. Registre comentários, salvamentos e vendas para saber se ele venceu\.$/, (title) => `“${title}” se publicó hace unos días. Registra comentarios, guardados y ventas para saber si ganó.`],
  [/^(\d+) carrosséis publicados esperam resultado\. Registre os números para encontrar seus vencedores\.$/, (n) => `${n} carruseles publicados esperan un resultado. Registra los números para encontrar tus ganadores.`],
  [/^(\d+) carrosséis agendados foram publicados no Instagram\.$/, (n) => `${n} carruseles programados se publicaron en Instagram.`],
  [/^Atualizar (\d+) cards$/, (n) => `Actualizar ${n} tarjetas`],
  [/^Atualizar (\d+) card$/, (n) => `Actualizar ${n} tarjeta`],
  [/^Gerar (\d+) cards$/, (n) => `Generar ${n} tarjetas`],
  [/^Gerar (\d+) card$/, (n) => `Generar ${n} tarjeta`],
  [/^(\d+) cards$/, (n) => `${n} tarjetas`],
  [/^(\d+) card$/, (n) => `${n} tarjeta`],
  [/^(\d+) páginas$/, (n) => `${n} páginas`],
  [/^(\d+) página$/, (n) => `${n} página`],
  [/^(\d+) slides$/, (n) => `${n} diapositivas`],
  [/^(\d+) slide$/, (n) => `${n} diapositiva`],
  [/^Card (\d+): (.+)$/, (n, title) => `Tarjeta ${n}: ${title}`],
  [/^Card (\d+) · arte ainda não gerada$/, (n) => `Tarjeta ${n} · la ilustración todavía no se generó`],
  [/^Capa · arte ainda não gerada$/, () => 'Portada · la ilustración todavía no se generó'],
  [/^Card (\d+)$/, (n) => `Tarjeta ${n}`],
  [/^Página (\d+)$/, (n) => `Página ${n}`],
  [/^Story (\d+)$/, (n) => `Historia ${n}`],
  [/^Foto (\d+)$/, (n) => `Foto ${n}`],
  [/^Horário (\d+) da rotina$/, (n) => `Horario ${n} de la rutina`],
  [/^Horário (\d+)$/, (n) => `Horario ${n}`],
  [/^Opção de capa (\d+)$/, (n) => `Opción de portada ${n}`],
  [/^Referência (\d+)$/, (n) => `Referencia ${n}`],
  [/^Remover referência (\d+)$/, (n) => `Quitar referencia ${n}`],
  [/^Remover horário (\d+)$/, (n) => `Quitar horario ${n}`],
  [/^Remover cena (.+)$/, (name) => `Quitar escena ${name}`],
  [/^Remover referência (.+)$/, (name) => `Quitar referencia ${name}`],
  [/^Remover @(.+)$/, (name) => `Quitar @${name}`],
  [/^Remover: (.+)$/, (text) => `Quitar: ${text}`],
  [/^Remover (.+)$/, (name) => `Quitar ${name}`],
  [/^Editar (card|página|slide) (\d+)$/, (unit, n) => `Editar ${unit === 'card' ? 'tarjeta' : unit === 'página' ? 'página' : 'diapositiva'} ${n}`],
  [/^Editar card$/, () => 'Editar tarjeta'],
  [/^Editar página$/, () => 'Editar página'],
  [/^Editar slide$/, () => 'Editar diapositiva'],
  [/^Postar agora em (\d+) contas$/, (n) => `Publicar ahora en ${n} cuentas`],
  [/^Postar agora em @(.+)$/, (user) => `Publicar ahora en @${user}`],
  [/^(\d+) seguidores$/, (n) => `${n} seguidores`],
  [/^(\d+) fotos do mesmo ambiente$/, (n) => `${n} fotos del mismo ambiente`],
  [/^Ver todas \((\d+)\)$/, (n) => `Ver todas (${n})`],
  [/^Ver conversa inteira \((\d+)\)$/, (n) => `Ver la conversación completa (${n})`],
  [/^Revisão (\d+)\/(\d+)$/, (a, b) => `Revisión ${a}/${b}`],
  [/^Instagram: (\d+) contas conectadas$/, (n) => `Instagram: ${n} cuentas conectadas`],
  [/^(\d+) coletas disponíveis\. O gráfico aparece a partir de 4 dias medidos\.$/, (n) => `${n} mediciones disponibles. El gráfico aparece a partir de 4 días medidos.`],
  [/^Seguidores coletados em (\d+) dias, de (.+) para (.+)\. Dias sem coleta ficam em branco\.$/, (n, a, b) => `Seguidores medidos en ${n} días, de ${a} a ${b}. Los días sin medición quedan en blanco.`],
  [/^Agendado para (.+) em (.+)\. O computador precisa estar ligado nesse horário \(o app pode estar fechado\)\.$/, (when, names) => `Programado para ${when} en ${names}. La computadora tiene que estar encendida a esa hora (la app puede estar cerrada).`],
  [/^Publicado em (.+)\.$/, (names) => `Publicado en ${names}.`],
  [/^Nova data salva: “(.+)” em (.+)\.$/, (title, when) => `Nueva fecha guardada: “${title}” el ${when}.`],
  [/^Nova data salva: (.+)\.$/, (when) => `Nueva fecha guardada: ${when}.`],
  [/^Trocar a data de ([\s\S]+)\npara (.+)\?$/, (item, when) => `Cambiar la fecha de ${item}\n¿para ${when}?`],
  [/^Cancelar o agendamento de ([\s\S]+)\?\nO carrossel continua salvo no app\.$/, (item) => `¿Cancelar la programación de ${item}?\nEl carrusel sigue guardado en la app.`],
  [/^Salvo em (.+)\. Em instantes aparece no app do Drive no celular\.$/, (folder) => `Guardado en ${folder}. En un momento aparece en la app de Drive en el celular.`],
  [/^Você já está na versão mais recente \((.+)\)\.$/, (version) => `Ya estás en la versión más reciente (${version}).`],
  [/^A versão (.+) do Carrossell foi baixada\. Ela será instalada quando você fechar o app\.$/, (version) => `La versión ${version} de Carrossell ya se descargó. Se instalará cuando cierres la app.`],
  [/^A versão (.+) já foi baixada\. Ela será instalada quando você sair do Carrossell\.$/, (version) => `La versión ${version} ya se descargó. Se instalará cuando salgas de Carrossell.`],
  [/^A versão (.+) do Carrossell está disponível\. Abra o app e clique em Baixar\.$/, (version) => `La versión ${version} de Carrossell está disponible. Abre la app y haz clic en Descargar.`],
  [/^A versão (.+) está disponível\. Abra o app e clique em Baixar\.$/, (version) => `La versión ${version} está disponible. Abre la app y haz clic en Descargar.`],
  [/^Baixando a versão (.+)\. Avisamos quando estiver pronta\.$/, (version) => `Descargando la versión ${version}. Avisamos cuando esté lista.`],
  [/^Válido até (.+)$/, (when) => `Válido hasta ${when}`],
  [/^Guia copiado\. Cole no (.+)\.$/, (file) => `Guía copiada. Pégala en ${file}.`],
  [/^@(.+) removida do Composio\.$/, (user) => `@${user} eliminada de Composio.`],
  [/^Material gratuito para quem comentar (.+) no carrossel “(.+)”\.$/, (keyword, title) => `Material gratuito para quien comente ${keyword} en el carrusel “${title}”.`],
  [/^Entregar na DM de quem comentar no carrossel “(.+)”\.$/, (title) => `Entregar por DM a quien comente en el carrusel “${title}”.`],
  [/^“(.+)” é o material entregue para quem comentar\.$/, (title) => `“${title}” es el material que recibe quien comente.`],
  [/^(.+) salvo nos seus projetos\.$/, (label) => `${translateUi('es', label)} se guardó en tus proyectos.`],
  [/^Texto do story (\d+)$/, (n) => `Texto de la historia ${n}`],
  [/^Tipo de carrossel do horário (\d+)$/, (n) => `Tipo de carrusel del horario ${n}`],
  [/^Estilo do horário (\d+)$/, (n) => `Estilo del horario ${n}`],
  [/^Quantidade de cards do horário (\d+), de 2 a 10$/, (n) => `Cantidad de tarjetas del horario ${n}, de 2 a 10`],
  [/^Aprovar (.+)$/, (name) => `Aprobar ${name}`],
  [/^Descartar pedido: (.+)$/, (name) => `Descartar el pedido: ${name}`],
  [/^Marca: (.+)$/, (label) => `Marca: ${translateUi('es', label)}`],
  [/^Ir para (.+)$/, (label) => `Ir a ${translateUi('es', label)}`],
  [/^(\d+) conta disponível$/, (n) => `${n} cuenta disponible`],
  [/^(\d+) contas disponíveis\. Marque as contas padrão deste perfil em Gerenciar contas\.$/, (n) => `${n} cuentas disponibles. Marca las cuentas predeterminadas de este perfil en Administrar cuentas.`],
  [/^(.+) · (.+)\nPrévia do carrossel\. Confira os cards e a legenda antes de aprovar\.$/, (name, title) => `${name} · ${title}\nVista previa del carrusel. Revisa las tarjetas y la leyenda antes de aprobar.`],
  [/^Legenda:\n\(sem legenda\)$/, () => 'Leyenda:\n(sin leyenda)'],
  [/^Legenda:\n([\s\S]+)$/, (caption) => `Leyenda:\n${caption}`],
  [/^Marca: (.+)\nContas: (.+)\nRotina sem revisão: publicando agora\. Para revisar antes, mude em Piloto automático › Configurar rotina\.$/, (name, accounts) => `Marca: ${name}\nCuentas: ${accounts}\nRutina sin revisión: publicando ahora. Para revisar antes, cámbialo en Piloto automático › Configurar rutina.`],
  [/^Marca: (.+)\nContas: (.+)\nO que fazer com este carrossel\? Você também pode aprovar no app\.$/, (name, accounts) => `Marca: ${name}\nCuentas: ${accounts}\n¿Qué hacemos con este carrusel? También puedes aprobarlo en la app.`],
  [/^(.+) · (.+)\nAgendar para (.+) \(horário do computador\)\?\nContas: (.+)$/, (brand, title, when, accounts) => `${brand} · ${title}\n¿Programar para ${when} (hora de la computadora)?\nCuentas: ${accounts}`],
  [/^Envie a data e hora para “(.+)”, como 2026-11-03 18:00\. Use o horário do computador\. A próxima mensagem pedirá confirmação\.$/, (title) => `Envía la fecha y la hora para “${title}”, como 2026-11-03 18:00. Usa la hora de la computadora. El siguiente mensaje pedirá confirmación.`],
  [/^Envie a data como 2026-11-03 18:00, no horário do computador\.$/, () => 'Envía la fecha como 2026-11-03 18:00, en la hora de la computadora.'],
  [/^(.+): aprovado no app\. Agendando para (.+)\.$/, (title, when) => `${title}: aprobado en la app. Programando para ${when}.`],
  [/^(.+): aprovado no app\. Publicando agora\.$/, (title) => `${title}: aprobado en la app. Publicando ahora.`],
  [/^(.+): publicado nas contas escolhidas\.$/, (title) => `${title}: publicado en las cuentas elegidas.`],
  [/^(.+): agendamento confirmado\.$/, (title) => `${title}: programación confirmada.`],
  [/^(.+): não foi possível concluir\. ([\s\S]+)$/, (title, rest) => `${title}: no se pudo completar. ${rest}`],
  [/^Contexto montado a partir da página do seu produto\. Revise e corrija o que estiver como HIPÓTESE\.$/, () => 'Contexto armado a partir de la página de tu producto. Revisa y corrige lo que esté como HIPÓTESE.'],
  [/^Contexto montado a partir da sua descrição\. Revise e corrija o que estiver como HIPÓTESE\.$/, () => 'Contexto armado a partir de tu descripción. Revisa y corrige lo que esté como HIPÓTESE.'],
  [/^(\d+) carrosséis aguardando$/, (n) => `${n} carruseles en espera`],
  [/^Posts agendados \(horário do computador\):/, () => 'Publicaciones programadas (hora de la computadora):'],
];

function applyPattern(text) {
  for (const [re, format] of PATTERNS) {
    const match = text.match(re);
    if (match) return format(...match.slice(1));
  }
  return null;
}

export function translateUi(locale, text) {
  if (!isSpanish(locale) || typeof text !== 'string' || text === '') return text;
  if (Object.hasOwn(catalog, text)) return catalog[text];
  const trimmed = text.trim();
  if (trimmed !== text && Object.hasOwn(catalog, trimmed)) {
    return text.replace(trimmed, catalog[trimmed]);
  }
  const patterned = applyPattern(trimmed);
  if (patterned === null) return text;
  return trimmed === text ? patterned : text.replace(trimmed, patterned);
}

export function templateCopy(locale) {
  if (!isSpanish(locale)) {
    return {
      lang: 'pt-BR',
      brand: 'Sua marca',
      handle: 'seuperfil',
      verified: 'verificado',
      scene: 'Cena aprovada',
      photo: 'Sua foto',
      swipe: 'arrasta pro lado ›',
      learn: '→ Deslize para aprender',
    };
  }
  return {
    lang: 'es',
    brand: 'Tu marca',
    handle: 'tuperfil',
    verified: 'verificado',
    scene: 'Escena aprobada',
    photo: 'Tu foto',
    swipe: 'desliza ›',
    learn: '→ Desliza para aprender',
  };
}

const SPANISH_OUTPUT = `IDIOMA DE SALIDA (obligatorio; anula cualquier pedido de escribir en portugués que haya quedado en los materiales del curso):
Escribe en español latinoamericano neutro todo lo que una persona va a leer: títulos, textos de las tarjetas, leyenda, CTAs, historias, mensajes directos, respuestas, documentos de marca, ideas, nombres de escenas y el texto dibujado en las imágenes. El método P.A.C.T.O. no cambia: mismas arquitecturas, misma progresión, mismos límites y la misma calidad.
- No traduzcas el nombre de la marca, los precios, los datos del negocio ni las claves del JSON.
- Si el campo architecture tiene que coincidir con el método, usa exactamente uno de estos nombres: Lista Útil, Tutorial, Framework, Estudo de Caso, História → Método → Oferta.
- Los marcadores === NOME DA MARCA ===, === CONTEXTO DA MARCA === y === DESIGN KIT === se quedan así, porque la app los lee. El texto de los documentos va en español.
- Voz: como la marca le hablaría a un cliente en un audio. Frases cortas (la mayoría de hasta 15 palabras), orden directo, verbos concretos, palabras de todos los días ("usar", no "utilizar"; "ayudar", no "viabilizar"). Si hay que leer la frase dos veces, reescríbela.
- Prohibido: la raya (—); el contraste actuado ("no es X, es Y", "no se trata de X, se trata de Y", "no solo X, sino Y"); la pregunta que tú mismo respondes ("¿El resultado? ..."); la revelación con dos puntos ("La verdad: ...", "Spoiler: ..."); la lista de negaciones ("sin X, sin Y, sin Z"); aperturas hechas ("En el mundo de hoy", "Imagina...", "Vamos", "La verdad es que", "Te cuento"); cierres de efecto ("Y eso lo cambia todo", "Piénsalo"); palabras de conferencia (jornada, desbloquear, potenciar, apalancar, siguiente nivel, transformador, poderoso, increíble); signos de exclamación en serie.
- Persuasión: claridad antes que ingenio; beneficio antes que función; habla de "tú"; la portada abre un lazo que solo cierra al final; el último pedido es uno solo, con verbo y lo que la persona gana ("Comenta GUÍA y te la envío").
- CTA corto de portada: "Desliza". Nunca "Arrasta para o lado" ni una segunda idea.
- No inventes pruebas, números, clientes ni precios. Sin prueba, usa ejemplo, paso o demostración.
- Ortografía del español: tildes, ñ y signos de apertura.`;

const PROMPT_REPLACEMENTS = [
  ['Responda em português do Brasil e retorne JSON conforme o esquema.', 'Responde en español latinoamericano neutro y devuelve JSON según el esquema.'],
  ['Responda em português do Brasil, em JSON conforme o esquema.', 'Responde en español latinoamericano neutro, en JSON según el esquema.'],
  ['Responda em português do Brasil.', 'Responde en español latinoamericano neutro.'],
  ['Responda em português brasileiro.', 'Responde en español latinoamericano neutro.'],
  ['Português do Brasil, linguagem curta e natural.', 'Español latinoamericano neutro, lenguaje corto y natural.'],
  ['Português do Brasil, linguagem humana.', 'Español latinoamericano neutro, lenguaje humano.'],
  ['Português do Brasil. JSON conforme o esquema.', 'Español latinoamericano neutro. JSON según el esquema.'],
  ['Português do Brasil.', 'Español latinoamericano neutro.'],
  ['como "Arrasta para o lado"', 'como "Desliza"'],
  ['("Comenta CHECKLIST que eu te mando")', '("Comenta GUÍA y te la envío")'],
  ['revisando letra por letra a ortografia e os acentos em português', 'revisando letra por letra la ortografía y los acentos en español'],
  ['label: nome curto da cena em português (até 6 palavras). prompt: descrição visual completa para gerar a foto, em português.', 'label: nombre corto de la escena en español (hasta 6 palabras). prompt: descripción visual completa para generar la foto, en español.'],
];

// pt-BR devolve o pedido igual, sem acrescentar nada. es troca as ordens de idioma e acrescenta o contrato.
export function localizePrompt(prompt, locale) {
  if (!isSpanish(locale)) return prompt;
  let text = String(prompt ?? '');
  for (const [from, to] of PROMPT_REPLACEMENTS) text = text.split(from).join(to);
  if (!text.includes('IDIOMA DE SALIDA')) text = `${text}\n\n${SPANISH_OUTPUT}`;
  return text;
}

export const SPANISH_OUTPUT_CONTRACT = SPANISH_OUTPUT;
