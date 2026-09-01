export type SupportedLocale = 'en' | 'zh';

export function readLocale(acceptLanguage: unknown): SupportedLocale {
  if (typeof acceptLanguage !== 'string') return 'en';
  return acceptLanguage.trim().toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
