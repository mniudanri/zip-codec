import { MAX_CLIPBOARD_CHARS } from '@shared/config/env';

export type ClipboardOutcome = 'copied' | 'too-large' | 'unavailable' | 'failed';

export function canCopy(length: number): boolean {
  return length <= MAX_CLIPBOARD_CHARS;
}

/**
 * copies text, refusing payloads large enough to lock up the main thread.
 */
export async function copyText(value: string): Promise<ClipboardOutcome> {
  if (!canCopy(value.length)) {
    return 'too-large';
  }
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return 'unavailable';
  }
  
  try {
    await navigator.clipboard.writeText(value);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function describeClipboardOutcome(outcome: ClipboardOutcome): string {
  switch (outcome) {
    case 'copied':
      return 'Copied to the clipboard.';
    case 'too-large':
      return 'The payload is too large to copy safely. Download it instead.';
    case 'unavailable':
      return 'The clipboard API is unavailable. It requires a secure context (https or localhost).';
    case 'failed':
      return 'The browser refused the clipboard write.';
  }
}