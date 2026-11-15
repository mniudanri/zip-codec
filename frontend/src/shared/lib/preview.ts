export interface PreviewResult {
  text: string;
  truncated: boolean;
  totalChars: number | null;
}

/**
 * bounds how much of a payload is ever handed to React
 */
export function previewString(value: string, maxChars: number): PreviewResult {
  if (value.length <= maxChars) {
    return { text: value, truncated: false, totalChars: value.length };
  }
  return { text: value.slice(0, maxChars), truncated: true, totalChars: value.length };
}

/**
 * reads only the leading slice of a Blob, so previewing a 130 MB Base64 body
 * costs the same as previewing a small one
 */
export async function previewBlob(blob: Blob, maxChars: number): Promise<PreviewResult> {
  const slice = blob.slice(0, maxChars);
  const text = await slice.text();

  return {
    text,
    truncated: blob.size > maxChars,
    totalChars: blob.size,
  };
}