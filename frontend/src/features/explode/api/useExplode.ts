import { archiveApi } from '@shared/api/archiveClient';
import type { EncodingVariant, ExplodeResponse } from '@shared/domain/archive';
import {
  useAbortableMutation,
  type AbortableMutationResult,
} from '@shared/hooks/useAbortableMutation';
import { useTransferProgress, type TransferProgressState } from '@shared/hooks/useTransferProgress';

export interface ExplodeVariables {
  file: File;
  recurse: boolean;
  variant: EncodingVariant;
}

export interface ExplodeOutcome extends ExplodeResponse {
  sourceName: string;
}

export type UseExplodeResult = AbortableMutationResult<ExplodeOutcome, ExplodeVariables> & {
  progress: TransferProgressState;
};

export function useExplode(): UseExplodeResult {
  const progress = useTransferProgress();

  const mutation = useAbortableMutation<ExplodeOutcome, ExplodeVariables>(
    async (variables, signal) => {
      progress.reset();
      const response = await archiveApi.explode(
        variables.file,
        { recurse: variables.recurse, variant: variables.variant },
        {
          signal,
          onUploadProgress: progress.onUploadProgress,
          onDownloadProgress: progress.onDownloadProgress,
        },
      );
      return { ...response, sourceName: variables.file.name };
    },
  );

  return { ...mutation, progress };
}