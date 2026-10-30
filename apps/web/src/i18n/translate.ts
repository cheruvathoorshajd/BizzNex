import { createIntl, createIntlCache } from 'react-intl';
import type { IntlShape } from 'react-intl';
import type { Language } from '../types';
import { messages } from './messages';
import { dayPart } from '../ui/transitions';

type Values = Record<string, string | number>;
const cache = createIntlCache();
const intls: Partial<Record<Language, IntlShape>> = {};

/** Translate outside React (e.g. the API client's sign-out screen), in the user's chosen language. */
export function translate(language: Language, id: string, values?: Values): string {
  const intl = (intls[language] ??= createIntl({ locale: language, messages: messages[language], defaultLocale: 'en' }, cache));
  return intl.formatMessage({ id, defaultMessage: id }, values);
}

/** "Good afternoon, Dennis." in the user's language (the transition screens' greeting). */
export function greet(t: (id: string, values?: Values) => string, name?: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${t('dash.greeting', { part: dayPart(), name: first })}.` : t('tx.greetingAnon', { part: dayPart() });
}
