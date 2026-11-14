import { useSyncExternalStore } from 'react';
import type { ArchiveNode } from '@shared/domain/archive';


/**
 * a one-shot channel for passing a result from one feature to another
 * (encode -> decode, explode -> rebuild)
 */
export interface Base64Handoff {
  kind: 'base64';
  label: string;
  blob: Blob;
  sha256: string | null;
  variant: string | null;
}

export interface TreeHandoff {
  kind: 'tree';
  label: string;
  root: ArchiveNode;
}

export type Handoff = Base64Handoff | TreeHandoff;

let current: Handoff | null = null;

const listeners = new Set<() => void>();
function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Handoff | null {
  return current;
}

export function setHandoff(next: Handoff | null): void {
  current = next;
  emit();
}

// reads and clears the pending handoff
export function takeHandoff(): Handoff | null {
  const value = current;
  if (value !== null) {
    current = null;
    emit();
  }
  return value;
}

export function useHandoff(): Handoff | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}