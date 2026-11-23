import { agentActions, licenseControlActions } from '../core/control.mjs';
import { TERMS_URL, TERMS_VERSION, normalizeLicenseEmail } from '../core/license.mjs';
import { ACTIONS, GOALS } from '../core/runtime.mjs';
import { CARD_COUNTS } from '../core/store.mjs';
import { FORMATS, STYLES } from '../core/templates.mjs';

export class Usage extends Error {}
const switches = new Set(['help', 'aceito', 'usar', 'listar', 'sem-esperar', 'so-stories', 'confirmar']);
const commands = {
  ajuda: [0, 0, 'agente'],
  versao: [0, 0],
  status: [0, 0],
  skills: [0, 0],
  perfis: [0, 0],
  perfil: { usar: [1, Infinity], criar: [1, Infinity, 'usar'] },
  marca: { '': [0, 0], configurar: [0, 0, 'link descricao'], aprovar: [0, 0, 'nome'], salvar: [0, 0, 'contexto design nome', 'contexto design'] },
  licenca: { status: [0, 0], ativar: [0, 0, 'email aceito'] },
  pautas: [0, 0, 'foco listar'],
  projetos: [0, 0],
  projeto: [1, 1],
  criar: [0, 0, 'pauta titulo estilo cards formato objetivo sem-esperar agente slides quantas capa exportar'],
  mensagem: [2, Infinity, 'sem-esperar'],
  editar: [1, 1, 'json', 'json'],
  aprovar: [1, 1],
  capas: [1, 1, 'quantas sem-esperar'],
  'escolher-capa': [2, 2, 'sem-esperar'],
  gerar: [1, 1, 'card sem-esperar'],
  tarefa: [2, 2, 'pasta'],
  texto: [1, 1, 'arquivo', 'arquivo'],
  cta: [1, 1, 'arquivo'],
  stories: [1, 1, 'arquivo fundo'],
  'fundo-stories': [2, 2],
  revisar: [0, 1, 'arquivo'],
  card: [2, 2, 'html imagem'],
  esperar: [1, 1],
  cancelar: [0, 0],
  exportar: [1, 1, 'pasta so-stories', 'pasta'],
  instagram: { '': [0, 0], conectar: [0, 0], contas: [0, 0], padrao: [1, Infinity] },
  postar: [1, 1, 'confirmar contas em'],
  agendados: [0, 0],
  reagendar: [1, 1, 'em', 'em'],
  'cancelar-agendamento': [1, 1],
  metricas: [0, 1],
  'posts-instagram': [0, 0, 'conta limite'],
  chamar: [1, 1, 'json'],
};
const aliases = new Map([['licença', 'licenca'], ['versão', 'versao'], ['--version', 'versao'], ['-v', 'versao'], ['help', 'ajuda'], ['-h', '--help']]);
const callable = new Set([...ACTIONS, ...Object.keys(agentActions(null)), ...Object.keys(licenseControlActions(null)), 'subscribe']);
const projectCommands = new Set(['projeto', 'mensagem', 'editar', 'aprovar', 'capas', 'escolher-capa', 'gerar', 'tarefa', 'texto', 'cta', 'stories', 'fundo-stories', 'revisar', 'card', 'esperar', 'exportar', 'postar', 'reagendar', 'cancelar-agendamento', 'metricas']);
const split = value => value ? value.split(' ') : [];

function validateNumber(value, label, min, max = Number.MAX_SAFE_INTEGER) {
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
    throw new Usage(`Valor inválido para ${label}.`);
  }
}

export function parseCommand(argv) {
  const positional = [], flags = Object.create(null);
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    const arg = i === 0 ? aliases.get(raw) || raw : raw;
    if (!arg.startsWith('--')) {
      if (arg.startsWith('-')) throw new Usage(`Opção desconhecida: ${arg}.`);
      if (!arg.trim()) throw new Usage('Informe um argumento que não esteja vazio.');
      positional.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split(/=(.*)/s);
    if (Object.hasOwn(flags, key)) throw new Usage(`Opção repetida: --${key}.`);
    const next = argv[i + 1];
    if (switches.has(key) && inline !== undefined) throw new Usage(`Use --${key} sem valor.`);
    flags[key] = inline ?? (!switches.has(key) && next !== undefined && !next.startsWith('--') ? argv[++i] : true);
  }

  const [cmd = 'ajuda', ...rest] = positional;
  if (!Object.hasOwn(commands, cmd)) throw new Usage(`Comando desconhecido: ${cmd}. Veja "carrossell ajuda".`);
  if (flags.help) return { cmd: 'ajuda', rest: [], flags };
  const command = commands[cmd], sub = Array.isArray(command) ? null : rest[0] || '';
  const spec = sub === null ? command : Object.hasOwn(command, sub) ? command[sub] : null;
  if (!spec) throw new Usage(`Use carrossell ${cmd} ${Object.keys(command).filter(Boolean).join('|')}.`);
  const [min, max, optional, required] = spec;
  const count = rest.length - (sub ? 1 : 0);
  if (count < min || count > max) throw new Usage(`Confira os argumentos de "carrossell ${[cmd, sub].filter(Boolean).join(' ')}".`);
  const allowed = new Set([...split(optional), ...(['versao', 'ajuda'].includes(cmd) ? [] : ['perfil', 'timeout'])]);
  for (const [key, value] of Object.entries(flags)) {
    if (!allowed.has(key)) throw new Usage(`Opção desconhecida para ${cmd}: --${key}.`);
    if ((value === true && !switches.has(key) && key !== 'agente') || (typeof value === 'string' && !value.trim())) {
      throw new Usage(`Informe um valor para --${key}.`);
    }
  }
  for (const key of split(required)) {
    if (!flags[key]) throw new Usage(`Informe --${key}.`);
  }
  if (projectCommands.has(cmd) && rest[0] && !/^[a-zA-Z0-9_-]{1,100}$/.test(rest[0])) throw new Usage('Identificador do projeto inválido.');
  for (const [key, low, high] of [['timeout', 1], ['quantas', 1, 3], ['capa', 1, 3], ['card', 1, 12], ['limite', 1]]) {
    if (flags[key] !== undefined) validateNumber(flags[key], `--${key}`, low, high);
  }

  if (cmd === 'criar') {
    if (flags.estilo && !STYLES.includes(flags.estilo)) throw new Usage(`Use --estilo ${STYLES.join('|')}.`);
    if (flags.formato && !FORMATS.includes(flags.formato)) throw new Usage(`Use --formato ${FORMATS.join('|')}.`);
    if (flags.objetivo && !GOALS.includes(flags.objetivo)) throw new Usage(`Use --objetivo com um destes valores: ${GOALS.join(', ')}.`);
    if (flags.cards) validateNumber(flags.cards, '--cards', CARD_COUNTS[0], CARD_COUNTS.at(-1));
    if (flags.slides) {
      if (flags.estilo === 'ia') throw new Usage('A capa do estilo ia precisa do ChatGPT. Use um estilo de modelo ou envie arte pronta com carrossell card <id> <n> --imagem <arquivo.png>.');
      if (flags.formato && flags.formato !== 'carrossel') throw new Usage('--slides cria um carrossel.');
      if (flags['sem-esperar']) throw new Usage('--slides espera a arte terminar. Retire --sem-esperar.');
      if (Number(flags.capa || 1) > Number(flags.quantas || 1)) throw new Usage('--capa deve estar entre 1 e a quantidade de capas (--quantas).');
    } else {
      if (!flags.pauta) throw new Usage('Informe --pauta "<tema>" ou --slides <plano.json>.');
      if (flags.quantas || flags.capa || flags.exportar) throw new Usage('Use --quantas, --capa e --exportar com --slides.');
    }
  }
  if (cmd === 'licenca' && sub === 'ativar') {
    if (!flags.aceito) throw new Usage(`Para ativar, leia os termos (${TERMS_VERSION}) em ${TERMS_URL} e repita com --aceito.`);
    if (!normalizeLicenseEmail(flags.email)) throw new Usage('Informe o e-mail usado na compra com --email <e-mail>.');
  }
  if (cmd === 'marca' && sub === 'configurar' && Boolean(flags.link) === Boolean(flags.descricao)) throw new Usage('Use --link <url> ou --descricao "<o que você vende>".');
  if (cmd === 'card') {
    validateNumber(rest[1], 'o número do card', 1);
    if (Boolean(flags.html) === Boolean(flags.imagem)) throw new Usage('Use --html <arquivo> ou --imagem <arquivo.png>.');
  }
  if (cmd === 'escolher-capa') validateNumber(rest[1], 'o número da capa', 1, 6);
  if (cmd === 'tarefa' && !['texto', 'cta', 'stories', 'arte'].includes(rest[1])) throw new Usage('Use: carrossell tarefa <id> texto|cta|stories|arte');
  if (cmd === 'fundo-stories' && !['preto', 'branco'].includes(rest[1])) throw new Usage('Use: carrossell fundo-stories <id> preto|branco');
  if (flags.fundo && !['preto', 'branco'].includes(flags.fundo)) throw new Usage('Use --fundo preto ou --fundo branco.');
  if (cmd === 'revisar' && Boolean(rest[0]) === Boolean(flags.arquivo)) throw new Usage('Use: carrossell revisar <id> ou carrossell revisar --arquivo <texto ou JSON>.');
  if (cmd === 'postar' && !flags.confirmar) throw new Usage('Postar publica no Instagram para todo mundo ver. Confira o carrossel (carrossell projeto <id>) e repita com --confirmar.');
  if (cmd === 'chamar' && !callable.has(rest[0])) throw new Usage(`Ação desconhecida: ${rest[0]}.`);
  return { cmd, rest, flags };
}
