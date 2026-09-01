import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { t } = useLocale();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <main className="app-shell">
        <div className="page page--centered">
          <p className="muted">{t('Loading…')}</p>
        </div>
      </main>
    );
  }

  if (status === 'anonymous') {
    // `replace` keeps the protected URL out of history, so Back does not
    // bounce between it and the login page. `state.from` lets the login page
    // return the user where they were headed.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
