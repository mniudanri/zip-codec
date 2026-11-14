/**
 * client side SHA-256, used to verify a decoded archive in the browser
 */
export function isSubtleCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle?.digest === 'function';
}

export async function sha256Hex(blob: Blob): Promise<string> {
  if (!isSubtleCryptoAvailable()) {
    throw new Error('Web Crypto is unavailable. It requires a secure context (https or localhost).');
  }

  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function digestsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) {
    return false;
  }
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
export function isValidSha256(value: string): boolean {
  return SHA256_PATTERN.test(value.trim());
}