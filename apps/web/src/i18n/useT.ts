import { useIntl } from 'react-intl';

/** Tiny wrapper: t('some.id', { name: 'Dennis' }) -> localized string. */
export const useT = () => {
  const intl = useIntl();
  return (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id, defaultMessage: id }, values);
};
