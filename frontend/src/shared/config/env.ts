import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('/api/v1/archives'),
  VITE_HEALTH_URL: z.string().min(1).default('/actuator/health'),
  VITE_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),
  VITE_MAX_PREVIEW_CHARS: z.coerce.number().int().positive().default(4_000),
  VITE_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(268_435_456),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid frontend environment configuration:\n${issues}`);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;

// archive.encoding.max-inline-base64-chars.
export const MAX_INLINE_BASE64_CHARS = 33_554_432;

// a base64 string is roughly 4/3 the size of the bytes it encodes
export const BASE64_EXPANSION_RATIO = 4 / 3;

// largest archive that still fits inside the inline encode response
export const MAX_INLINE_ARCHIVE_BYTES = Math.floor(
  MAX_INLINE_BASE64_CHARS / BASE64_EXPANSION_RATIO,
);

/**
 * copying more than this to the clipboard locks up the main thread, so the UI
 * offers a download instead.
 */
export const MAX_CLIPBOARD_CHARS = 1_000_000;