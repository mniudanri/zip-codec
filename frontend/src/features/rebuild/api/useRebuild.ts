import { archiveApi } from '@shared/api/archiveClient';
import type { BinaryResult } from '@shared/api/httpClient';
import type { ArchiveNode, EncodingVariant } from '@shared/domain/archive';
import {
  useAbortableMutation,
  type AbortableMutationResult,
} from '@shared/hooks/useAbortableMutation';
import { useTransferProgress, type TransferProgressState } from '@shared/hooks/useTransferProgress';

export interface RebuildVariables {
  root: ArchiveNode;
  variant: EncodingVariant;
}

export interface RebuildOutcome {
  blob: Blob;
  filename: string;
}

export type UseRebuildResult = AbortableMutationResult<RebuildOutcome, RebuildVariables> & {
  progress: TransferProgressState;
};

function nameFrom(result: BinaryResult, root: ArchiveNode): string {
  if (result.filename) {
    return result.filename;
  }
  return root.name && root.name !== '' ? `${root.name}.zip` : 'rebuilt.zip';
}

export function useRebuild(): UseRebuildResult {
  const progress = useTransferProgress();

  const mutation = useAbortableMutation<RebuildOutcome, RebuildVariables>(
    async (variables, signal) => {
      progress.reset();
      
      const result = await archiveApi.rebuild(
        { root: variables.root, variant: variables.variant },
        {
          signal,
          onUploadProgress: progress.onUploadProgress,
          onDownloadProgress: progress.onDownloadProgress,
        },
      );
      return { blob: result.blob, filename: nameFrom(result, variables.root) };
    },
  );

  return { ...mutation, progress };
}