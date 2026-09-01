import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { LocaleProvider, useLocale } from './LocaleContext';

function Example() {
  const { t } = useLocale();
  return <span>{t('Pantry')}</span>;
}

beforeEach(() => window.localStorage.clear());

describe('LocaleProvider', () => {
  test('switches to Chinese and persists the choice', async () => {
    render(
      <LocaleProvider>
        <LanguageSwitcher />
        <Example />
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '中文' }));

    expect(screen.getByText('食材库')).toBeTruthy();
    await waitFor(() => expect(window.localStorage.getItem('mosaic-kitchen-locale')).toBe('zh'));
    expect(document.documentElement.lang).toBe('zh-CN');
  });
});
