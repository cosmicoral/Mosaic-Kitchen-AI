import { Languages } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <div aria-label="Language" className="language-switcher" role="group">
      <Languages aria-hidden="true" size={16} />
      <button aria-pressed={locale === 'en'} onClick={() => setLocale('en')} type="button">EN</button>
      <span>/</span>
      <button aria-pressed={locale === 'zh'} onClick={() => setLocale('zh')} type="button">中文</button>
    </div>
  );
}
