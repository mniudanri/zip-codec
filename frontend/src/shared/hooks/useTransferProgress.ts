import { useCallback, useMemo, useState } from 'react';
import type { TransferProgress } from '@shared/api/httpClient';

export interface TransferProgressState {
  upload: TransferProgress | null;
  download: TransferProgress | null;
  active: boolean;
  reset: () => void;
  onUploadProgress: (progress: TransferProgress) => void;
  onDownloadProgress: (progress: TransferProgress) => void;
}
/**
 * tracks upload and download progress for a single in-flight transfer
 */
export function useTransferProgress(): TransferProgressState {
  const [upload, setUpload] = useState<TransferProgress | null>(null);
  const [download, setDownload] = useState<TransferProgress | null>(null);

  const reset = useCallback(() => {
    setUpload(null);
    setDownload(null);
  }, []);
  
  return useMemo(
    () => ({
      upload,
      download,
      active: upload !== null || download !== null,
      reset,
      onUploadProgress: setUpload,
      onDownloadProgress: setDownload,
    }),
    [upload, download, reset],
  );
}