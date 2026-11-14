export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  violation?: string;
  code?: string;
  [key: string]: unknown;
}

export type ExpectedBody = 'json' | 'text' | 'binary';

export function parseRawHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!raw) {
    return headers;
  }

  for (const line of raw.trim().split(/[\r\n]+/)) {
    const separator = line.indexOf(':');
    if (separator <= 0) {
      continue;
    }

    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (name) {
      headers[name] = value;
    }
  }

  return headers;
}

export function isJsonContentType(contentType: string | null | undefined): boolean {
  if (!contentType) {
    return false;
  }
  const value = contentType.toLowerCase();
  return value.includes('application/json') || value.includes('+json');
}

export function classifyResponse(
  status: number,
  contentType: string | null | undefined,
  expected: ExpectedBody,
): 'success' | 'problem' {
  if (status === 0 || status >= 400) {
    return 'problem';
  }
  if (expected === 'binary' && isJsonContentType(contentType)) {
    return 'problem';
  }
  return 'success';
}

export function parseProblemDetail(body: string): ProblemDetail | null {
  const trimmed = body.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as ProblemDetail;
  } catch {
    return null;
  }
}

export function extractViolation(problem: ProblemDetail | null | undefined): string | undefined {
  if (!problem) {
    return undefined;
  }

  const direct = problem.violation ?? problem.code;
  if (typeof direct === 'string' && direct.length > 0) {
    return direct;
  }

  if (typeof problem.type === 'string') {
    const segment = problem.type.split('/').filter(Boolean).pop();
    if (segment && /^[A-Z0-9_]+$/.test(segment)) {
      return segment;
    }
  }
  return undefined;
}

const FILENAME_STAR = /filename\*=(?:UTF-8'')?([^;]+)/i;
const FILENAME_PLAIN = /filename="?([^";]+)"?/i;

export function parseContentDispositionFilename(
  contentDisposition: string | null | undefined,
): string | undefined {
  if (!contentDisposition) {
    return undefined;
  }

  const encoded = FILENAME_STAR.exec(contentDisposition);
  const encodedValue = encoded?.[1];
  if (encodedValue) {
    try {
      return decodeURIComponent(encodedValue.trim());
    } catch {
      return encodedValue.trim();
    }
  }

  const plain = FILENAME_PLAIN.exec(contentDisposition);
  const plainValue = plain?.[1];

  return plainValue ? plainValue.trim() : undefined;
}

export interface TransferProgress {
  loaded: number;
  total: number | null;
  percent: number | null;
}

export function toTransferProgress(loaded: number, total: number, lengthComputable: boolean): TransferProgress {
  if (!lengthComputable || total <= 0) {
    return { loaded, total: null, percent: null };
  }
  
  return {
    loaded,
    total,
    percent: Math.min(100, Math.round((loaded / total) * 100)),
  };
}