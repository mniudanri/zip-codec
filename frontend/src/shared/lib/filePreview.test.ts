import { describe, expect, it } from 'vitest';
import {
  buildFilePreview,
  detectImageType,
  looksBinary,
  MAX_TEXT_PREVIEW_BYTES,
  sanitizeDisplayName,
} from './filePreview';

function toBase64(bytes: number[] | Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function textToBase64(value: string): string {
  return toBase64(new TextEncoder().encode(value));
}

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];

describe('detectImageType', () => {
  it('identifies a PNG from its signature', () => {
    expect(detectImageType(new Uint8Array(PNG_HEADER))).toBe('image/png');
  });
  it('returns null for SVG, which must never be given a blob URL', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    expect(detectImageType(svg)).toBeNull();
  });
});

describe('looksBinary', () => {
  it('treats a NUL byte as binary', () => {
    expect(looksBinary(new Uint8Array([0x68, 0x00, 0x69]))).toBe(true);
  });

  it('accepts tabs and newlines as text', () => {
    expect(looksBinary(new TextEncoder().encode('a\tb\r\nc'))).toBe(false);
  });
});

describe('buildFilePreview', () => {
  it('reports empty content', () => {
    expect(buildFilePreview(null).kind).toBe('empty');
    expect(buildFilePreview('').kind).toBe('empty');
  });

  it('previews UTF-8 text', () => {
    const preview = buildFilePreview(textToBase64('hello wörld'));
    expect(preview).toMatchObject({ kind: 'text', text: 'hello wörld', truncated: false });
  });

  it('decodes the URL_SAFE alphabet, which atob rejects untouched', () => {
    // 0xFB 0xFF encodes as "+/8=" in standard and "-_8=" in URL-safe Base64.
    const urlSafe = toBase64([0xfb, 0xff, 0x41]).replace(/\+/g, '-').replace(/\//g, '_');
    expect(() => buildFilePreview(urlSafe)).not.toThrow();
  });

  it('decodes MIME-wrapped Base64', () => {
    const wrapped = `${textToBase64('wrapped content here')}\r\n`;
    expect(buildFilePreview(wrapped)).toMatchObject({ kind: 'text' });
  });

  it('classifies HTML as text rather than something renderable', () => {
    const preview = buildFilePreview(textToBase64('<script>alert(1)</script>'));
    expect(preview.kind).toBe('text');
  });

  it('falls back to a hex dump for binary content', () => {
    const preview = buildFilePreview(toBase64([0x00, 0x01, 0x02, 0x03]));
    expect(preview.kind).toBe('binary');
    if (preview.kind === 'binary') {
      expect(preview.hex).toContain('00000000');
    }
  });

  it('truncates text beyond the preview bound', () => {
    const big = 'a'.repeat(MAX_TEXT_PREVIEW_BYTES + 5_000);
    const preview = buildFilePreview(textToBase64(big));
    expect(preview).toMatchObject({ kind: 'text', truncated: true });
    if (preview.kind === 'text') {
      expect(preview.text.length).toBeLessThanOrEqual(MAX_TEXT_PREVIEW_BYTES);
    }
  });
});

describe('sanitizeDisplayName', () => {
  it('neutralises the right-to-left override used to disguise filenames', () => {
    expect(sanitizeDisplayName('invoice\u202egnp.exe')).toBe('invoice\ufffdgnp.exe');
  });
  
  it('leaves ordinary names untouched', () => {
    expect(sanitizeDisplayName('docs/readme.txt')).toBe('docs/readme.txt');
  });
});