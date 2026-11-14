import { extractViolation, type ProblemDetail } from './responseParsing';
export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'contract';
interface ApiErrorOptions {
  status?: number;
  problem?: ProblemDetail;
  cause?: unknown;
}
/**
 * map for error backend response
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly problem?: ProblemDetail;

  constructor(kind: ApiErrorKind, message: string, options: ApiErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ApiError';
    this.kind = kind;
    if (options.status !== undefined) {
      this.status = options.status;
    }
    if (options.problem !== undefined) {
      this.problem = options.problem;
    }
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static http(status: number, problem?: ProblemDetail): ApiError {
    const message = problem?.detail ?? problem?.title ?? `The service responded with HTTP ${status}.`;
    return new ApiError('http', message, { status, ...(problem ? { problem } : {}) });
  }

  static network(cause?: unknown): ApiError {
    return new ApiError(
      'network',
      'Could not reach the service. Check that it is running and that no proxy is intercepting localhost.',
      { cause },
    );
  }

  static timeout(timeoutMs: number): ApiError {
    return new ApiError('timeout', `The request exceeded the ${timeoutMs} ms client timeout.`);
  }

  static aborted(): ApiError {
    return new ApiError('aborted', 'The request was cancelled.');
  }

  static contract(message: string, cause?: unknown): ApiError {
    return new ApiError('contract', message, { cause });
  }

  get violation(): string | undefined {
    return extractViolation(this.problem);
  }

  get isAborted(): boolean {
    return this.kind === 'aborted';
  }

  get title(): string {
    if (this.problem?.title) {
      return this.problem.title;
    }

    switch (this.kind) {
      case 'network':
        return 'Service unreachable';
      case 'timeout':
        return 'Request timed out';
      case 'aborted':
        return 'Request cancelled';
      case 'contract':
        return 'Unexpected response';
      default:
        return this.status ? `Request failed (HTTP ${this.status})` : 'Request failed';
    }
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }
  if (error instanceof Error) {
    return new ApiError('network', error.message, { cause: error });
  }

  return new ApiError('network', 'An unexpected error occurred.', { cause: error });
}

const VIOLATION_HINTS: Record<string, string> = {
  PATH_TRAVERSAL:
    'An entry name tried to escape the archive root (a "Zip Slip" path). The archive was rejected before anything was read.',
  ABSOLUTE_PATH: 'An entry used an absolute or drive-qualified path, which is not allowed.',
  PATH_TOO_LONG: 'An entry path exceeded the configured maximum length.',
  ENTRY_COUNT_EXCEEDED:
    'The archive contains more entries than the service allows. Raise archive.limits.max-entry-count if this is legitimate.',
  ENTRY_SIZE_EXCEEDED: 'A single entry is larger than archive.limits.max-entry-bytes.',
  TOTAL_SIZE_EXCEEDED:
    'The archive expands to more than the configured budget. Raise archive.limits.max-total-uncompressed-bytes if this is legitimate.',
  COMPRESSION_RATIO_EXCEEDED:
    'The compression ratio exceeded the ceiling, which is the signature of a zip bomb.',
  NESTING_TOO_DEEP:
    'Archives are nested deeper than archive.limits.max-nesting-depth (3 by default).',
  ENCRYPTED_ENTRY: 'The archive contains an encrypted entry, which cannot be read.',
  UNSUPPORTED_ENTRY_TYPE: 'The archive contains a symlink or an unsupported compression method.',
};

/**
 * turns a failure into something the user can act on
 */
export function remediationFor(error: unknown): string | undefined {
  if (!isApiError(error)) {
    return undefined;
  }

  const violation = error.violation;
  if (violation && VIOLATION_HINTS[violation]) {
    return VIOLATION_HINTS[violation];
  }

  const detail = (error.problem?.detail ?? error.message).toLowerCase();
  if (detail.includes('truncated')) {
    return 'The Base64 was cut short, so the archive has no end-of-central-directory record. Upload the .b64 file instead of pasting the text - a shell command line truncates at a few thousand characters.';
  }
  if (detail.includes('sha-256') || detail.includes('sha256')) {
    return 'The decoded bytes do not match the expected digest, which almost always means the Base64 was truncated or edited in transit. Re-encode and transfer the payload as a file.';
  }
  if (detail.includes('not valid base64') || detail.includes('invalid base64')) {
    return 'The payload is not valid Base64 for the selected alphabet. Make sure the variant matches the one used to encode.';
  }
  if (detail.includes('not a zip')) {
    return 'The decoded bytes are not a ZIP archive. Check that the variant matches the one used to encode.';
  }

  switch (error.status) {
    case 413:
      return 'The payload is above the inline ceiling. Switch the encode mode to "Streaming", which has no size limit.';
    case 415:
      return 'The upload was not readable as a ZIP. Only ZIP archives are supported - a self-extracting .exe starts with "MZ" rather than "PK" and is rejected here.';
    case 404:
      return 'The endpoint was not found. Check VITE_API_BASE_URL and that the dev server proxy points at the running service.';
    default:
      break;
  }

  if (error.kind === 'network') {
    return 'Wait till the server is up and come back later.';
  }
  if (error.kind === 'timeout') {
    return 'Large archives can take a while. Raise VITE_REQUEST_TIMEOUT_MS, or use the streaming endpoints which begin transferring immediately.';
  }

  return undefined;
}