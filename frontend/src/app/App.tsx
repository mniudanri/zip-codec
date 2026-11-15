import { AppProviders } from '@app/providers/AppProviders';
import { RootErrorBoundary } from '@app/errors/RootErrorBoundary';
import { AppRouter } from '@app/router/AppRouter';

export function App() {
  return (
    <AppProviders>
      <RootErrorBoundary>
        <AppRouter />
      </RootErrorBoundary>
    </AppProviders>
  );
}