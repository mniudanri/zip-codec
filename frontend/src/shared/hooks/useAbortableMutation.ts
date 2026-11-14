import { useCallback, useMemo, useRef } from 'react';
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toApiError, type ApiError } from '@shared/api/ApiError';


export type AbortableMutationResult<TData, TVariables> = UseMutationResult<
  TData,
  ApiError,
  TVariables
> & {
  cancel: () => void;
};

/**
 * a mutation that can be cancelled.
 */
export function useAbortableMutation<TData, TVariables>(
  mutationFn: (variables: TVariables, signal: AbortSignal) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, ApiError, TVariables>, 'mutationFn'>,
): AbortableMutationResult<TData, TVariables> {
  const controllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation<TData, ApiError, TVariables>({
    ...options,
    mutationFn: async (variables: TVariables) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        return await mutationFn(variables, controller.signal);
      } catch (error) {
        throw toApiError(error);
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
  });

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);
  
  return useMemo(() => ({ ...mutation, cancel }), [mutation, cancel]);
}