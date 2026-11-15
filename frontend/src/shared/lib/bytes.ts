const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
export const EM_DASH = '\u2014';

// human-readable byte size
export function formatBytes(bytes: number | null | undefined, fractionDigits = 1): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return EM_DASH;
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(fractionDigits)} ${BYTE_UNITS[unitIndex] ?? 'B'}`;
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return value.toLocaleString('en-US');
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)} ms`;
  }
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

// bytes a base64 string of this length decodes to ignore padding
export function base64CharsToBytes(chars: number): number {
  return Math.floor((chars * 3) / 4);
}

// base64 characters a payload of this many bytes produces, including padding
export function bytesToBase64Chars(bytes: number): number {
  return Math.ceil(bytes / 3) * 4;
}