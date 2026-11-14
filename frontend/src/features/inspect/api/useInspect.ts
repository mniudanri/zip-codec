import { archiveApi } from '@shared/api/archiveClient';
import type { ExplodeResponse } from '@shared/domain/archive';
import {
  useAbortableMutation,
  type AbortableMutationResult,
} from '@shared/hooks/useAbortableMutation';
import { useTransferProgress, type TransferProgressState } from '@shared/hooks/useTransferProgress';

export interface InspectVariables {
  file: File;
  recurse: boolean;
}

export interface InspectOutcome extends ExplodeResponse {
  sourceName: string;
}

export type UseInspectResult = AbortableMutationResult<InspectOutcome, InspectVariables> & {
  progress: TransferProgressState;
};

/**
 * response shape is identical to Explode, but every content field is absent,
 * which keeps the payload proportional to the number of entries rather than to the 
 * size of the archive
 */
export function useInspect(): UseInspectResult {
  const progress = useTransferProgress();

  const mutation = useAbortableMutation<InspectOutcome, InspectVariables>(
    async (variables, signal) => {
      progress.reset();
      const response = await archiveApi.inspect(
        variables.file,
        { recurse: variables.recurse },
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