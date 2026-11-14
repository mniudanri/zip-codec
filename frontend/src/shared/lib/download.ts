// triggers a browser download and releases the object URL afterwards
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // revoking synchronously can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadText(text: string, filename: string, type = 'text/plain'): void {
  downloadBlob(new Blob([text], { type }), filename);
}

export function downloadJson(value: unknown, filename: string): void {
  downloadText(JSON.stringify(value, null, 2), filename, 'application/json');
}

const TRAILING_EXTENSION = /\.[^./\\]+$/;
export function stripExtension(filename: string): string {
  return filename.replace(TRAILING_EXTENSION, '');
}

// bundle.zip -> bundle.zip.b64
export function base64NameFor(archiveName: string | undefined): string {
  return `${archiveName && archiveName.length > 0 ? archiveName : 'archive.zip'}.b64`;
}

// bundle.zip.b64 -> bundle.zip
export function archiveNameFor(sourceName: string | undefined, fallback = 'restored.zip'): string {
  if (!sourceName || sourceName.length === 0) {
    return fallback;
  }
  const withoutWrapper = /\.(b64|txt|base64)$/i.test(sourceName)
    ? stripExtension(sourceName)
    : sourceName;
  return /\.zip$/i.test(withoutWrapper) ? withoutWrapper : `${withoutWrapper}.zip`;
}

// docs/readme.txt -> readme.txt
export function leafName(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments.length > 0 ? (segments[segments.length - 1] ?? path) : path;
}

// decodes a base64 entry payload into a blob without building an intermediate string
export function base64ToBlob(base64: string, mimeType?: string | null): Blob {
  const binary = atob(base64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType ?? 'application/octet-stream' });
}