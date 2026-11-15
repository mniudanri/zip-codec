import { archiveApi } from '@shared/api/archiveClient';
import { env } from '@shared/config/env';
import type { ArchiveManifest, EncodingVariant } from '@shared/domain/archive';
import {
  useAbortableMutation,
  type AbortableMutationResult,
} from '@shared/hooks/useAbortableMutation';
import { useTransferProgress, type TransferProgressState } from '@shared/hooks/useTransferProgress';
import { previewBlob, previewString, type PreviewResult } from '@shared/lib/preview';

export type EncodeMode = 'stream' | 'inline';

export interface EncodeVariables {
  file: File;
  variant: EncodingVariant;
  mode: EncodeMode;
}

export interface EncodeResult {
  mode: EncodeMode;
  manifest: ArchiveManifest;

  // the base64 payload as a blob, which is what the download uses either way
  blob: Blob;

  // resent only for inline runs. streaming never materialises the full string
  fullText: string | null;

  preview: PreviewResult;
  sourceName: string;
}

export type UseEncodeResult = AbortableMutationResult<EncodeResult, EncodeVariables> & {
  progress: TransferProgressState;
};

/**
 * Encode in either mode behind one hook.
 *
 * The streaming path deliberately keeps the payload as a blob and only reads a
 * slice for the preview
 */
export function useEncode(): UseEncodeResult {
  const progress = useTransferProgress();
  const mutation = useAbortableMutation<EncodeResult, EncodeVariables>(
    async (variables, signal) => {
      progress.reset();

      const options = {
        signal,
        onUploadProgress: progress.onUploadProgress,
        onDownloadProgress: progress.onDownloadProgress,
      };

      if (variables.mode === 'stream') {
        const { manifest, blob } = await archiveApi.encodeStream(
          variables.file,
          variables.variant,
          options,
        );

        return {
          mode: 'stream',
          manifest,
          blob,
          fullText: null,
          preview: await previewBlob(blob, env.VITE_MAX_PREVIEW_CHARS),
          sourceName: variables.file.name,
        };
      }
      
      const response = await archiveApi.encode(variables.file, variables.variant, options);
      
      return {
        mode: 'inline',
        manifest: response.manifest,
        blob: new Blob([response.base64], { type: 'text/plain' }),
        fullText: response.base64,
        preview: previewString(response.base64, env.VITE_MAX_PREVIEW_CHARS),
        sourceName: variables.file.name,
      };
    },
  );
  return { ...mutation, progress };
}