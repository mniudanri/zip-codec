import { env } from '@shared/config/env';
import {
  archiveManifestSchema,
  encodeResponseSchema,
  explodeResponseSchema,
  healthSchema,
  type ArchiveManifest,
  type DecodeRequest,
  type EncodeResponse,
  type EncodingVariant,
  type ExplodeResponse,
  type Health,
  type RebuildRequest,
} from '@shared/domain/archive';
import type { z } from 'zod';
import { ApiError } from './ApiError';
import { httpClient, type BinaryResult, type RequestOptions } from './httpClient';


const base = env.VITE_API_BASE_URL.replace(/\/+$/, '');

export const archiveEndpoints = {
  encode: `${base}/encode`,
  encodeStream: `${base}/encode/stream`,
  explode: `${base}/explode`,
  inspect: `${base}/inspect`,
  decode: `${base}/decode`,
  decodeStream: `${base}/decode/stream`,
  rebuild: `${base}/rebuild`,
} as const;

type QueryValue = string | number | boolean | undefined | null;

function withQuery(url: string, params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw ApiError.contract(`The ${context} response did not match the expected shape (${issues}).`);
  }

  return result.data;
}

function fileForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file, file.name);

  return form;
}

function numberFromHeader(headers: Record<string, string>, name: string): number | undefined {
  const raw = headers[name];
  if (raw === undefined) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * api /encode/stream returns the manifest in "X-Archive" as a custom header,
 * so the backend must also list in "Access-Control-Expose-Headers" when the UI is served from
 * a different origin
 */
function manifestFromHeaders(headers: Record<string, string>, filename: string): ArchiveManifest {
  const candidate = {
    filename,
    sizeBytes: numberFromHeader(headers, 'x-archive-size-bytes') ?? null,
    sha256: headers['x-archive-sha256'] ?? null,
    entryCount: numberFromHeader(headers, 'x-archive-entry-count') ?? null,
    maxDepth: numberFromHeader(headers, 'x-archive-max-depth') ?? null,
    variant: headers['x-archive-variant'] ?? null,
    base64Length: numberFromHeader(headers, 'content-length') ?? null,
    entryNameCharset: headers['x-archive-entry-name-charset'] ?? null,
  };

  return parseOrThrow(archiveManifestSchema, candidate, 'streaming encode');
}

export interface StreamEncodeResult {
  manifest: ArchiveManifest;
  blob: Blob;
}

export interface ExplodeParams {
  recurse?: boolean;
  variant?: EncodingVariant;
}

export interface DecodeStreamParams {
  expectedSha256?: string;
  variant?: EncodingVariant;
}

// list calling APIs
export const archiveApi = {
  // call encode
  async encode(
    file: File,
    variant: EncodingVariant | undefined,
    options: RequestOptions = {},
  ): Promise<EncodeResponse> {
    const url = withQuery(archiveEndpoints.encode, { variant });
    const json = await httpClient.postMultipartJson(url, fileForm(file), options);
    return parseOrThrow(encodeResponseSchema, json, 'encode');
  },

  // call encode stream
  async encodeStream(
    file: File,
    variant: EncodingVariant | undefined,
    options: RequestOptions = {},
  ): Promise<StreamEncodeResult> {
    const url = withQuery(archiveEndpoints.encodeStream, { variant });
    const result = await httpClient.postMultipartBinary(url, fileForm(file), options);
    return { manifest: manifestFromHeaders(result.headers, file.name), blob: result.blob };
  },

  // call explode
  async explode(
    file: File,
    params: ExplodeParams = {},
    options: RequestOptions = {},
  ): Promise<ExplodeResponse> {
    const url = withQuery(archiveEndpoints.explode, {
      recurse: params.recurse,
      variant: params.variant,
    });
    const json = await httpClient.postMultipartJson(url, fileForm(file), options);
    return parseOrThrow(explodeResponseSchema, json, 'explode');
  },

  // call inspect
  async inspect(
    file: File,
    params: { recurse?: boolean } = {},
    options: RequestOptions = {},
  ): Promise<ExplodeResponse> {
    const url = withQuery(archiveEndpoints.inspect, { recurse: params.recurse });
    const json = await httpClient.postMultipartJson(url, fileForm(file), options);
    return parseOrThrow(explodeResponseSchema, json, 'inspect');
  },
  decode(request: DecodeRequest, options: RequestOptions = {}): Promise<BinaryResult> {
    return httpClient.postJsonBinary(archiveEndpoints.decode, request, options);
  },

  /**
   * call decode stream.
   * 
   * accepts a blob so a .b64 file never has to be read into a JavaScript string,
   * which keeps memory flat regardless of payload size.
   */
  decodeStream(
    payload: string | Blob,
    params: DecodeStreamParams = {},
    options: RequestOptions = {},
  ): Promise<BinaryResult> {
    const url = withQuery(archiveEndpoints.decodeStream, {
      expectedSha256: params.expectedSha256,
      variant: params.variant,
    });

    return httpClient.postTextBinary(url, payload, options);
  },

  // call rebuild
  rebuild(request: RebuildRequest, options: RequestOptions = {}): Promise<BinaryResult> {
    return httpClient.postJsonBinary(archiveEndpoints.rebuild, request, options);
  },

  // call health check
  async health(options: RequestOptions = {}): Promise<Health> {
    const json = await httpClient.getJson(env.VITE_HEALTH_URL, options);
    return parseOrThrow(healthSchema, json, 'health');
  },
};