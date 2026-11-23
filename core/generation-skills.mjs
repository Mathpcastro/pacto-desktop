import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLIDESHOW_HOOKS_ID } from './knowledge.mjs';

const kinds = ['plan', 'cover', 'stories'];
const bundled = fileURLToPath(new URL('../resources/skills/', import.meta.url));

function readSkills(folder) {
  let entries;
  try { entries = readdirSync(folder, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return entries.filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => entry.name).sort().flatMap(file => {
      const source = readFileSync(join(folder, file), 'utf8').replace(/^\uFEFF/, '');
      const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n([\s\S]*)$/.exec(source);
      if (!match) return [];
      const fields = {};
      for (const line of match[1].split(/\r?\n/)) {
        const field = /^(name|description|applies_to):[ \t]*(.+?)\s*$/.exec(line);
        if (field) fields[field[1]] = field[2];
      }
      const body = match[2].trim();
      if (!fields.name || !fields.description || !kinds.includes(fields.applies_to) || !body) return [];
      return [{ ...fields, body }];
    });
}

export function generationSkills({ bundledDir = bundled, userData } = {}) {
  const load = () => {
    const files = [
      ...readSkills(bundledDir),
      ...(userData ? readSkills(join(userData, 'skills')) : []),
    ];
    return [...new Map(files.map(skill => [skill.name, skill])).values()];
  };
  const slideshow = knowledge => knowledge?.skills?.find(skill => skill.id === SLIDESHOW_HOOKS_ID);
  return {
    listSkills: knowledge => {
      const hooks = slideshow(knowledge);
      const listed = load().filter(skill => skill.name !== hooks?.id)
        .map(({ name, description, applies_to }) => ({ name, description, applies_to }));
      if (hooks) listed.unshift({
        id: hooks.id, name: hooks.id, title: hooks.title,
        description: 'Categorias de gancho para a capa do carrossel.', applies_to: 'plan',
      });
      return listed;
    },
    skillContext: (kind, { style, knowledge } = {}) => {
      // Runtime.context injeta o conteúdo da skill embutida no lugar certo do prompt.
      const hooks = slideshow(knowledge);
      return load().filter(skill => skill.applies_to === kind && skill.name !== hooks?.id)
        .map(skill => `SKILL: ${skill.name}${style ? ` (estilo do projeto: ${style})` : ''}\n${skill.body}`).join('\n\n');
    },
  };
}

export const { listSkills, skillContext } = generationSkills();
