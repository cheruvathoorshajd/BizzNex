import { describe, it, expect } from 'vitest';
import { messages } from './messages';
import { translate } from './translate';

describe('messages', () => {
  const en = Object.keys(messages.en);
  for (const lang of ['es', 'fr'] as const) {
    it(`${lang} has every English message, and nothing extra`, () => {
      const keys = Object.keys(messages[lang]);
      expect(en.filter((k) => !keys.includes(k)), `missing in ${lang}`).toEqual([]);
      expect(keys.filter((k) => !en.includes(k)), `only in ${lang}`).toEqual([]);
    });
  }
  it('formats outside React, with plurals and the user language', () => {
    expect(translate('en', 'search.taskCount', { n: 1 })).toBe('1 task');
    expect(translate('es', 'search.taskCount', { n: 3 })).toBe('3 tareas');
    expect(translate('fr', 'tx.bye', { name: 'Dennis' })).toBe('À bientôt, Dennis.');
  });
});
