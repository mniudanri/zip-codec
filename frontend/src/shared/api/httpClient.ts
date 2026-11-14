import { env } from '@shared/config/env';
import { ApiError } from './ApiError';
import {
  classifyResponse,
  parseContentDispositionFilename,
  parseProblemDetail,
  parseRawHeaders,
  toTransferProgress,
  type ExpectedBody,
  type TransferProgress,
} from './responseParsing';


export interface RequestOptions {
  signal?: AbortSignal;
  onUploadProgress?: (progress: TransferProgress) => void;
  onDownloadProgress?: (progress: TransferProgress) => void;
  timeoutMs?: number;
}

export interface BinaryResult {
  blob: Blob;
  headers: Record<string, string>;
  filename?: string;
}

interface RawRequest {
  method: 'GET' | 'POST';
  url: string;
  body?: XMLHttpRequestBodyInit | null;
  headers?: Record<string, string>;
  expected: ExpectedBody;
}

interface RawResult {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

function sendRaw(request: RawRequest, options: RequestOptions): Promise<RawResult> {
  const timeoutMs = options.timeoutMs ?? env.VITE_REQUEST_TIMEOUT_MS;
  return new Promise<RawResult>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(ApiError.aborted());
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open(request.method, request.url, true);
    xhr.responseType = request.expected === 'binary' ? 'blob' : 'text';
    xhr.timeout = timeoutMs;

    for (const [name, value] of Object.entries(request.headers ?? {})) {
      xhr.setRequestHeader(name, value);
    }

    const onAbort = (): void => xhr.abort();
    options.signal?.addEventListener('abort', onAbort, { once: true });

    const cleanup = (): void => {
      options.signal?.removeEventListener('abort', onAbort);
    };

    if (options.onUploadProgress) {
      xhr.upload.onprogress = (event) => {
        options.onUploadProgress?.(
          toTransferProgress(event.loaded, event.total, event.lengthComputable),
        );
      };
    }

    if (options.onDownloadProgress) {
      xhr.onprogress = (event) => {
        options.onDownloadProgress?.(
          toTransferProgress(event.loaded, event.total, event.lengthComputable),
        );
      };
    }

    xhr.onload = () => {
      cleanup();
      resolve({
        status: xhr.status,
        headers: parseRawHeaders(xhr.getAllResponseHeaders()),
        body: xhr.response,
      });
    };

    xhr.onerror = () => {
      cleanup();
      reject(ApiError.network());
    };

    xhr.ontimeout = () => {
      cleanup();
      reject(ApiError.timeout(timeoutMs));
    };

    xhr.onabort = () => {
      cleanup();
      reject(ApiError.aborted());
    };

    xhr.send(request.body ?? null);
  });
}

async function bodyAsText(body: unknown): Promise<string> {
  if (body instanceof Blob) {
    return body.text();
  }
  return typeof body === 'string' ? body : String(body ?? '');
}

async function send(request: RawRequest, options: RequestOptions): Promise<RawResult> {
  const raw = await sendRaw(request, options);
  const contentType = raw.headers['content-type'];

  if (classifyResponse(raw.status, contentType, request.expected) === 'problem') {
    const text = await bodyAsText(raw.body);
    throw ApiError.http(raw.status, parseProblemDetail(text) ?? undefined);
  }

  return raw;
}

function parseJsonBody(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw ApiError.contract('The service returned a body that is not valid JSON.', cause);
  }
}

function toBinaryResult(raw: RawResult): BinaryResult {
  const blob = raw.body instanceof Blob ? raw.body : new Blob([String(raw.body ?? '')]);
  const filename = parseContentDispositionFilename(raw.headers['content-disposition']);
  return { blob, headers: raw.headers, ...(filename ? { filename } : {}) };
}

export const httpClient = {
  async getJson(url: string, options: RequestOptions = {}): Promise<unknown> {
    const raw = await send({ method: 'GET', url, expected: 'json' }, options);
    return parseJsonBody(await bodyAsText(raw.body));
  },

  async postJson(url: string, body: unknown, options: RequestOptions = {}): Promise<unknown> {
    const raw = await send(
      {
        method: 'POST',
        url,
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        expected: 'json',
      },
      options,
    );
    return parseJsonBody(await bodyAsText(raw.body));
  },

  // handle call API with file
  async postMultipartJson(
    url: string,
    form: FormData,
    options: RequestOptions = {},
  ): Promise<unknown> {
    const raw = await send({ method: 'POST', url, body: form, expected: 'json' }, options);
    return parseJsonBody(await bodyAsText(raw.body));
  },

  // handle call API with file in a stream
  async postMultipartBinary(
    url: string,
    form: FormData,
    options: RequestOptions = {},
  ): Promise<BinaryResult> {
    const raw = await send({ method: 'POST', url, body: form, expected: 'binary' }, options);
    return toBinaryResult(raw);
  },

  async postJsonBinary(
    url: string,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<BinaryResult> {
    const raw = await send(
      {
        method: 'POST',
        url,
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        expected: 'binary',
      },
      options,
    );
    return toBinaryResult(raw);
  },

  async postTextBinary(
    url: string,
    body: string | Blob,
    options: RequestOptions = {},
  ): Promise<BinaryResult> {
    const raw = await send(
      {
        method: 'POST',
        url,
        body,
        headers: { 'Content-Type': 'text/plain' },
        expected: 'binary',
      },
      options,
    );
    return toBinaryResult(raw);
  },
};

export type { TransferProgress };