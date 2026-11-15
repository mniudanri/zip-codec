import { base64CharsToBytes } from '@shared/lib/bytes';
import { base64ToBytes, normalizeBase64 } from '@shared/lib/download';

// text is read in bounded slices; a 500 MB entry must not reach the DOM
export const MAX_TEXT_PREVIEW_BYTES = 128 * 1024;

// images have to be decoded whole to render, so the ceiling is much lower
export const MAX_IMAGE_PREVIEW_BYTES = 8 * 1024 * 1024;

export const HEX_DUMP_BYTES = 1024;

/**
 * filter preview image
 */
export const PREVIEWABLE_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
] as const;

export type PreviewableImageType = (typeof PREVIEWABLE_IMAGE_TYPES)[number];

export type FilePreview =
  | { kind: 'empty' }
  | { kind: 'too-large'; byteLength: number }
  | { kind: 'text'; text: string; truncated: boolean; byteLength: number }
  | { kind: 'image'; blob: Blob; mimeType: PreviewableImageType; byteLength: number }
  | { kind: 'binary'; hex: string; truncated: boolean; byteLength: number };

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) {
    return false;
  }
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const GIF = [0x47, 0x49, 0x46, 0x38];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

// identifies a safe raster image from its header, or returns null
export function detectImageType(bytes: Uint8Array): PreviewableImageType | null {
  if (startsWith(bytes, PNG)) {
    return 'image/png';
  }
  if (startsWith(bytes, JPEG)) {
    return 'image/jpeg';
  }
  if (startsWith(bytes, GIF)) {
    return 'image/gif';
  }
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) {
    return 'image/webp';
  }
  return null;
}

export function looksBinary(bytes: Uint8Array): boolean {
  if (bytes.length === 0) {
    return false;
  }
  let control = 0;
  const sample = Math.min(bytes.length, 512);

  for (let i = 0; i < sample; i += 1) {
    const byte = bytes[i] ?? 0;
    if (byte === 0) {
      return true;
    }
    const printable = byte === 0x09 || byte === 0x0a || byte === 0x0d || byte >= 0x20;
    if (!printable) {
      control += 1;
    }
  }
  return control / sample > 0.02;
}

export function toHexDump(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const row = bytes.subarray(offset, offset + 16);
    const hex: string[] = [];
    let ascii = '';
    for (let i = 0; i < 16; i += 1) {
      const byte = row[i];
      if (byte === undefined) {
        hex.push('  ');
      } else {
        hex.push(byte.toString(16).padStart(2, '0'));
        ascii += byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.';
      }
    }
    const left = hex.slice(0, 8).join(' ');
    const right = hex.slice(8).join(' ');
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${left}  ${right}  |${ascii}|`);
  }
  return lines.join('\n');
}

const UNSAFE_DISPLAY_CHARS =
  // C0/C1 controls plus the bidi overrides and isolates behind "Trojan Source".
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/**
 * neutralises characters that let a filename lie about itself
 */
export function sanitizeDisplayName(name: string): string {
  return name.replace(UNSAFE_DISPLAY_CHARS, '\ufffd');
}

const REPLACEMENT = /\ufffd/g;

/**
 * produces a preview for one entry's base64 content
 */
export function buildFilePreview(content: string | null | undefined): FilePreview {
  if (!content) {
    return { kind: 'empty' };
  }

  const normalized = normalizeBase64(content);
  if (normalized.length === 0) {
    return { kind: 'empty' };
  }
  const byteLength = base64CharsToBytes(normalized.length);

  const header = base64ToBytes(normalized, 32);
  const imageType = detectImageType(header);

  if (imageType) {
    if (byteLength > MAX_IMAGE_PREVIEW_BYTES) {
      return { kind: 'too-large', byteLength };
    }
    // The type is the detected one, never the server-declared `mimeType`.
    const blob = new Blob([base64ToBytes(normalized)], { type: imageType });
    return { kind: 'image', blob, mimeType: imageType, byteLength };
  }

  const head = base64ToBytes(normalized, MAX_TEXT_PREVIEW_BYTES);
  const truncated = byteLength > head.length;

  if (looksBinary(head)) {
    const dump = head.subarray(0, HEX_DUMP_BYTES);
    return {
      kind: 'binary',
      hex: toHexDump(dump),
      truncated: byteLength > dump.length,
      byteLength,
    };
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(head);
  const replacements = text.match(REPLACEMENT)?.length ?? 0;
  if (text.length > 0 && replacements / text.length > 0.05) {
    const dump = head.subarray(0, HEX_DUMP_BYTES);
    return {
      kind: 'binary',
      hex: toHexDump(dump),
      truncated: byteLength > dump.length,
      byteLength,
    };
  }

  return { kind: 'text', text: sanitizeDisplayName(text), truncated, byteLength };
}