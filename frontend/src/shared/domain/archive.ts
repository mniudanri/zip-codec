import { z } from 'zod';

export const encodingVariantSchema = z.enum(['STANDARD', 'MIME', 'URL_SAFE']);

export type EncodingVariant = z.infer<typeof encodingVariantSchema>;

export const ENCODING_VARIANTS: readonly EncodingVariant[] = ['STANDARD', 'MIME', 'URL_SAFE'];

export const archiveManifestSchema = z.object({
  filename: z.string().nullish(),
  sizeBytes: z.number().nullish(),
  sha256: z.string().nullish(),
  entryCount: z.number().nullish(),
  maxDepth: z.number().nullish(),
  variant: encodingVariantSchema.nullish(),
  base64Length: z.number().nullish(),
  entryNameCharset: z.string().nullish(),
});

export type ArchiveManifest = z.infer<typeof archiveManifestSchema>;

export const fileNodeSchema = z.object({
  type: z.literal('FILE'),
  name: z.string(),
  path: z.string(),
  sizeBytes: z.number().nullish(),
  mimeType: z.string().nullish(),
  crc32: z.string().nullish(),
  content: z.string().nullish(),
});

export type FileNode = z.infer<typeof fileNodeSchema>;

export interface DirectoryNode {
  type: 'DIRECTORY';
  name: string;
  path: string;
  nestedArchive?: boolean | null;
  children: ArchiveNode[];
}

export type ArchiveNode = FileNode | DirectoryNode;

const directoryNodeSchema: z.ZodType<DirectoryNode> = z.lazy(() =>
  z.object({
    type: z.literal('DIRECTORY'),
    name: z.string(),
    path: z.string(),
    nestedArchive: z.boolean().nullish(),
    children: z.array(archiveNodeSchema),
  }),
);

export const archiveNodeSchema: z.ZodType<ArchiveNode> = z.union([
  fileNodeSchema,
  directoryNodeSchema,
]);

export const encodeResponseSchema = z.object({
  manifest: archiveManifestSchema,
  base64: z.string(),
});

export type EncodeResponse = z.infer<typeof encodeResponseSchema>;

export const explodeResponseSchema = z.object({
  manifest: archiveManifestSchema,
  root: archiveNodeSchema,
});

export type ExplodeResponse = z.infer<typeof explodeResponseSchema>;

export const rebuildRequestSchema = z.object({
  root: archiveNodeSchema,
  variant: encodingVariantSchema.optional(),
});

export type RebuildRequest = z.infer<typeof rebuildRequestSchema>;

export interface DecodeRequest {
  base64: string;
  expectedSha256?: string;
  variant?: EncodingVariant;
}

export const healthSchema = z.object({
  status: z.string(),
});

export type Health = z.infer<typeof healthSchema>;

export function isDirectory(node: ArchiveNode): node is DirectoryNode {
  return node.type === 'DIRECTORY';
}

export function isFile(node: ArchiveNode): node is FileNode {
  return node.type === 'FILE';
}

export interface TreeTotals {
  directories: number;
  files: number;
  bytes: number;
  withContent: number;
}

export function summarizeTree(node: ArchiveNode): TreeTotals {
  const totals: TreeTotals = { directories: 0, files: 0, bytes: 0, withContent: 0 };

  const visit = (current: ArchiveNode): void => {
    if (isDirectory(current)) {
      totals.directories += 1;
      for (const child of current.children) {
        visit(child);
      }
      return;
    }
    totals.files += 1;
    totals.bytes += current.sizeBytes ?? 0;
    if (current.content) {
      totals.withContent += 1;
    }
  };
  visit(node);

  totals.directories = Math.max(0, totals.directories - 1);
  return totals;
}

export function isRebuildable(node: ArchiveNode): boolean {
  if (isFile(node)) {
    return typeof node.content === 'string' && node.content.length > 0;
  }
  if (node.nestedArchive) {
    return false;
  }
  return node.children.every(isRebuildable);
}