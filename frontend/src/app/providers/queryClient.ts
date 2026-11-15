import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@shared/api/ApiError';

/**
 * every ZIP operation is an explicit, user-initiated POST over a large body,
 * so the usual caching defaults are wrong here. e.g. retrying a 200 MB upload automatically
 * would be expensive and surprising, and refetching on window focus would re-run work
 * the user did not ask for.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (isApiError(error) && (error.isAborted || error.kind === 'http')) {
            return false;
          }
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}