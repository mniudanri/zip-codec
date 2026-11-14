/**
 * Reports which project files are missing or empty.
 *
 * Run from the zip-codec-ui directory (the one containing package.json):
 *   node check-files.mjs
 */
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const EXPECTED = [
  '.env.example',
  '.gitignore',
  '.prettierrc.json',
  'README.md',
  'eslint.config.js',
  'index.html',
  'package.json',
  'postcss.config.cjs',
  'src/app/App.tsx',
  'src/app/errors/RootErrorBoundary.tsx',
  'src/app/layout/AppLayout.tsx',
  'src/app/layout/BackendStatus.tsx',
  'src/app/providers/AppProviders.tsx',
  'src/app/providers/queryClient.ts',
  'src/app/router/AppRouter.tsx',
  'src/app/router/routes.ts',
  'src/app/theme/theme.ts',
  'src/features/decode/api/useDecode.ts',
  'src/features/decode/index.ts',
  'src/features/decode/pages/DecodePage.tsx',
  'src/features/encode/api/useEncode.ts',
  'src/features/encode/index.ts',
  'src/features/encode/pages/EncodePage.tsx',
  'src/features/explode/api/useExplode.ts',
  'src/features/explode/index.ts',
  'src/features/explode/pages/ExplodePage.tsx',
  'src/features/home/index.ts',
  'src/features/home/pages/HomePage.tsx',
  'src/features/inspect/api/useInspect.ts',
  'src/features/inspect/index.ts',
  'src/features/inspect/pages/InspectPage.tsx',
  'src/features/rebuild/api/useRebuild.ts',
  'src/features/rebuild/index.ts',
  'src/features/rebuild/pages/RebuildPage.tsx',
  'src/index.css',
  'src/main.tsx',
  'src/shared/api/ApiError.ts',
  'src/shared/api/archiveClient.ts',
  'src/shared/api/httpClient.ts',
  'src/shared/api/responseParsing.ts',
  'src/shared/config/env.ts',
  'src/shared/config/modes.ts',
  'src/shared/domain/archive.ts',
  'src/shared/hooks/useAbortableMutation.ts',
  'src/shared/hooks/useTransferProgress.ts',
  'src/shared/lib/bytes.ts',
  'src/shared/lib/clipboard.ts',
  'src/shared/lib/download.ts',
  'src/shared/lib/preview.ts',
  'src/shared/lib/sha256.ts',
  'src/shared/state/handoff.ts',
  'src/shared/ui/ArchiveDropzone.tsx',
  'src/shared/ui/ArchiveTreeView.tsx',
  'src/shared/ui/Base64Preview.tsx',
  'src/shared/ui/ErrorPanel.tsx',
  'src/shared/ui/ManifestPanel.tsx',
  'src/shared/ui/PageHeader.tsx',
  'src/shared/ui/RunControls.tsx',
  'src/shared/ui/SectionCard.tsx',
  'src/shared/ui/TreeSummary.tsx',
  'src/shared/ui/VariantSelect.tsx',
  'src/shared/ui/index.ts',
  'src/vite-env.d.ts',
  'tsconfig.json',
  'vite.config.ts',
  'vitest.setup.ts',
];

const missing = [];
const empty = [];

for (const relative of EXPECTED) {
  const absolute = join(root, relative);
  if (!existsSync(absolute)) {
    missing.push(relative);
  } else if (statSync(absolute).size === 0) {
    empty.push(relative);
  }
}

console.log(`Checked ${EXPECTED.length} files in ${root}\n`);

if (missing.length > 0) {
  console.log(`MISSING (${missing.length}):`);
  for (const file of missing) {
    console.log(`  - ${file}`);
  }
  console.log('');
}

if (empty.length > 0) {
  console.log(`EMPTY (${empty.length}):`);
  for (const file of empty) {
    console.log(`  - ${file}`);
  }
  console.log('');
}

if (missing.length === 0 && empty.length === 0) {
  console.log('All files present. If Vite still fails, delete node_modules/.vite and restart.');
} else {
  process.exitCode = 1;
}