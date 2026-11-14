import { archiveApi } from '@shared/api/archiveClient';
import type { EncodingVariant } from '@shared/domain/archive';
import {
  useAbortableMutation,
  type AbortableMutationResult,
} from '@shared/hooks/useAbortableMutation';
import { useTransferProgress, type TransferProgressState } from '@shared/hooks/useTransferProgress';
import { archiveNameFor } from '@shared/lib/download';
import { digestsMatch, isSubtleCryptoAvailable, sha256Hex } from '@shared/lib/sha256';

export type DecodeMode = 'stream' | 'inline';

export type DecodeSource =
  | { kind: 'file'; file: File }
  | { kind: 'text'; text: string; label?: string }
  | { kind: 'blob'; blob: Blob; label: string };

export interface DecodeVariables {
  source: DecodeSource;
  mode: DecodeMode;
  variant: EncodingVariant;
  expectedSha256?: string;
  verifyLocally: boolean;
}

export interface DecodeResult {
  blob: Blob;
  filename: string;
  expectedSha256: string | null;
  actualSha256: string | null;
  /** null when no digest was available to compare against. */
  verified: boolean | null;
}

function sourceLabel(source: DecodeSource): string | undefined {
  switch (source.kind) {
    case 'file':
      return source.file.name;
    case 'blob':
      return source.label;
    case 'text':
      return source.label;
  }
}

export type UseDecodeResult = AbortableMutationResult<DecodeResult, DecodeVariables> & {
  progress: TransferProgressState;
};

/**
 * Decode, with an optional second opinion on the result.
 *
 * hashing the received blob based on expectedSha256, check whether the service is wrong
 * or downloaded blob is corrupted
 */
export function useDecode(): UseDecodeResult {
  const progress = useTransferProgress();

  const mutation = useAbortableMutation<DecodeResult, DecodeVariables>(async (variables, signal) => {
    progress.reset();
    const options = {
      signal,
      onUploadProgress: progress.onUploadProgress,
      onDownloadProgress: progress.onDownloadProgress,
    };
    const expected = variables.expectedSha256?.trim() ?? '';

    const result =
      variables.mode === 'stream'
        ? await archiveApi.decodeStream(
            variables.source.kind === 'file'
              ? variables.source.file
              : variables.source.kind === 'blob'
                ? variables.source.blob
                : variables.source.text,
            {
              ...(expected ? { expectedSha256: expected } : {}),
              variant: variables.variant,
            },
            options,
          )
        : await archiveApi.decode(
            {
              base64:
                variables.source.kind === 'text'
                  ? variables.source.text
                  : await (variables.source.kind === 'file'
                      ? variables.source.file
                      : variables.source.blob
                    ).text(),
              ...(expected ? { expectedSha256: expected } : {}),
              variant: variables.variant,
            },
            options,
          );

    const filename = result.filename ?? archiveNameFor(sourceLabel(variables.source));
    
    let actualSha256: string | null = null;
    if (variables.verifyLocally && isSubtleCryptoAvailable()) {
      actualSha256 = await sha256Hex(result.blob);
    }

    return {
      blob: result.blob,
      filename,
      expectedSha256: expected === '' ? null : expected,
      actualSha256,
      verified:
        expected === '' || actualSha256 === null ? null : digestsMatch(expected, actualSha256),
    };
  });
  
  return { ...mutation, progress };
}