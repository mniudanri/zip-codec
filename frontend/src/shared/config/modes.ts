import type { ComponentType } from 'react';
import {
  IconFileExport,
  IconFileImport,
  IconFolderOpen,
  IconHome,
  IconPackage,
  IconSearch,
} from '@tabler/icons-react';

export type ModeIcon = ComponentType<{ size?: number | string; stroke?: number }>;

export interface ModeDescriptor {
  id: 'home' | 'encode' | 'decode' | 'explode' | 'inspect' | 'rebuild';
  path: string;
  label: string;
  description: string;
  endpoint?: string;
  /** Path of the matching document in the backend repository. */
  docs?: string;
  icon: ModeIcon;
}

export const routePaths = {
  home: '/',
  encode: '/encode',
  decode: '/decode',
  explode: '/explode',
  inspect: '/inspect',
  rebuild: '/rebuild',
} as const;

export const modes: readonly ModeDescriptor[] = [
  {
    id: 'home',
    path: routePaths.home,
    label: 'Overview',
    description: 'What each mode does and when to reach for it.',
    icon: IconHome,
  },
  {
    id: 'encode',
    path: routePaths.encode,
    label: 'Encode',
    description: 'Turn a .zip into Base64 text, inline or streamed.',
    endpoint: 'POST /encode',
    docs: 'docs/encode-decode.md',
    icon: IconFileExport,
  },
  {
    id: 'decode',
    path: routePaths.decode,
    label: 'Decode',
    description: 'Turn Base64 text back into the original .zip.',
    endpoint: 'POST /decode',
    docs: 'docs/encode-decode.md',
    icon: IconFileImport,
  },
  {
    id: 'explode',
    path: routePaths.explode,
    label: 'Explode',
    description: 'Expand an archive into a JSON tree with per-entry Base64.',
    endpoint: 'POST /explode',
    docs: 'docs/explode.md',
    icon: IconFolderOpen,
  },
  {
    id: 'inspect',
    path: routePaths.inspect,
    label: 'Inspect',
    description: 'List the structure without carrying any file content.',
    endpoint: 'POST /inspect',
    docs: 'docs/inspect.md',
    icon: IconSearch,
  },
  {
    id: 'rebuild',
    path: routePaths.rebuild,
    label: 'Rebuild',
    description: 'Assemble a new .zip from an edited JSON tree.',
    endpoint: 'POST /rebuild',
    docs: 'docs/rebuild.md',
    icon: IconPackage,
  },
];

export const operationModes: readonly ModeDescriptor[] = modes.filter((mode) => mode.id !== 'home');