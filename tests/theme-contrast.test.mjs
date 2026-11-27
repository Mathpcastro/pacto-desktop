import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

function getRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{`).exec(styles);
  assert.ok(match, `CSS rule not found: ${selector}`);

  const open = match.index + match[0].lastIndexOf('{');
  let depth = 1;
  for (let i = open + 1; i < styles.length; i += 1) {
    if (styles[i] === '{') depth += 1;
    if (styles[i] === '}') depth -= 1;
    if (depth === 0) return styles.slice(open + 1, i);
  }

  assert.fail(`CSS rule is not closed: ${selector}`);
}

function getTokens(selector) {
  const tokens = Object.fromEntries(
    [...getRule(selector).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
      .map(([, name, value]) => [name, value.trim()]),
  );
  return tokens;
}

function resolveColor(value, tokens, seen = new Set()) {
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  if (reference) {
    const [, name] = reference;
    assert.ok(tokens[name], `Missing color token ${name}`);
    assert.ok(!seen.has(name), `Circular color token ${name}`);
    seen.add(name);
    return resolveColor(tokens[name], tokens, seen);
  }

  assert.match(value, /^#[\da-f]{6}$/i, `Expected a six-digit hex color, got ${value}`);
  return value.toLowerCase();
}

function luminance(hex) {
  const channels = hex.slice(1).match(/[\da-f]{2}/gi).map((channel) => parseInt(channel, 16) / 255);
  const linear = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function assertContrast(foreground, background, description) {
  const ratio = contrast(foreground, background);
  assert.ok(ratio >= 4.5, `${description}: expected at least 4.5:1, got ${ratio.toFixed(2)}:1`);
}

const light = getTokens(':root');
const dark = getTokens(':root[data-theme="dark"]');

test('Carrossell light and dark primary fills have AA button text contrast', () => {
  assert.equal(resolveColor(light['--accent'], light), '#ff5a36');
  assert.equal(resolveColor(dark['--accent'], dark), '#ff5a36');
  assert.equal(resolveColor(dark['--accent-hover'], dark), '#ff795c');
  assert.equal(resolveColor(dark['--on-accent'], dark), '#191919');

  for (const [theme, tokens] of [['light', light], ['dark', dark]]) {
    const onAccent = resolveColor(tokens['--on-accent'], tokens);
    assertContrast(onAccent, resolveColor(tokens['--accent'], tokens), `${theme} on-accent/accent`);
    assertContrast(onAccent, resolveColor(tokens['--accent-hover'], tokens), `${theme} on-accent/accent-hover`);
  }

  assert.equal(resolveColor(dark['--accent-ink'], dark), resolveColor(dark['--accent'], dark));
});

test('Carrossell light accent ink has AA contrast on light surfaces', () => {
  const ink = resolveColor(light['--accent-ink'], light);
  for (const token of ['--paper', '--surface', '--accent-soft', '--input']) {
    assertContrast(ink, resolveColor(light[token], light), `light accent-ink/${token}`);
  }
});

test('alternative palette colors stay unchanged and exclude Carrossell orange tokens', () => {
  const expected = {
    ocean: {
      light: ['#226b91', '#185577', '#ffffff'],
      dark: ['#79c7f1', '#a2dcfa', '#10212b'],
    },
    forest: {
      light: ['#3d7049', '#2d5838', '#ffffff'],
      dark: ['#a2d38c', '#c0e4ae', '#172519'],
    },
    violet: {
      light: ['#6e519c', '#563c81', '#ffffff'],
      dark: ['#c5a7ff', '#d8c5ff', '#281f35'],
    },
  };

  for (const [palette, themes] of Object.entries(expected)) {
    for (const [theme, values] of Object.entries(themes)) {
      const selector = `:root[data-theme="${theme}"][data-palette="${palette}"]`;
      const block = getRule(selector);
      assert.doesNotMatch(block, /#ff5a36|#c72400/i, `${selector} must not contain Carrossell orange values`);

      const tokens = getTokens(selector);
      assert.deepEqual(
        [
          resolveColor(tokens['--accent'], tokens),
          resolveColor(tokens['--accent-hover'], tokens),
          resolveColor(tokens['--on-accent'], tokens),
        ],
        values,
        `${selector} accent tokens changed`,
      );
      assert.equal(resolveColor(tokens['--accent-ink'], tokens), resolveColor(tokens['--accent'], tokens));
    }
  }
});
