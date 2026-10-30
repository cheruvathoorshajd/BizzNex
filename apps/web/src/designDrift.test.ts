import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import timing from './ui/transition-timing.json';

/**
 * Design drift: the design system lives in styles/aurora.scss, and a few documents keep their own
 * copies (they are standalone HTML, opened from disk or served as-is). These tests fail when a
 * copy stops matching the source, so a token or timing change has to update them too.
 */
const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

/** The `--name: value;` pairs inside the first block that starts with `selector`. */
function block(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`no ${selector} block`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  return out;
}

const app = read('apps/web/src/styles/aurora.scss');
const appRoot = block(app, ':root {');
const appLight = block(app, ':root[data-theme="light"]');
const appDark = block(app, ':root[data-theme="dark"]');

describe('design drift: the case study renders the shipped tokens', () => {
  const cs = read('bizznex-case-study.html');
  for (const [theme, appBlock] of [['light', appLight], ['dark', appDark]] as const) {
    it(`${theme} theme`, () => {
      const csBlock = block(cs, `:root[data-theme="${theme}"]`);
      const shared = Object.keys(csBlock).filter((k) => k in appBlock);
      expect(shared.length).toBeGreaterThan(10);
      for (const k of shared) expect([k, csBlock[k]]).toEqual([k, appBlock[k]]);
    });
  }
  it('the aurora mesh stops it lists are the app tokens', () => {
    for (const k of ['--aurora-iris', '--aurora-sky', '--aurora-aqua', '--aurora-blush']) {
      expect(appRoot[k], k).toMatch(/^#[0-9A-F]{6}$/i);
      expect(cs.toUpperCase()).toContain(`DATA-COPY="${appRoot[k].toUpperCase()}"`);
    }
  });
});

describe('design drift: the adopted Skyline identity page uses the app palette', () => {
  const sky = block(read('design-style-guides/bizznex-identity-skyline.html'), ':root');
  const map: Record<string, string> = { '--bg': '--paper', '--bg-2': '--paper-2', '--bg-3': '--paper-3', '--fg': '--ink', '--fg-soft': '--ink-soft', '--muted': '--muted' };
  it('light colours', () => {
    for (const [own, token] of Object.entries(map)) {
      if (sky[own]) expect([own, sky[own].replace(/\s*\/\*.*$/, '')]).toEqual([own, appLight[token]]);
    }
  });
});

describe('design drift: the case study replays the shipped transition timings', () => {
  it('its fallback copy matches transition-timing.json', () => {
    const line = read('bizznex-case-study.html').match(/var TIMING = (\{[^}]*\});/);
    expect(line).not.toBeNull();
    const copy = JSON.parse(line![1].replace(/(\w+):/g, '"$1":')) as Record<string, number[]>;
    for (const k of ['skyline', 'aurora', 'compact', 'calm'] as const) {
      expect([k, copy[k]]).toEqual([k, [timing[k].in, timing[k].hold, timing[k].out]]);
    }
  });
});
