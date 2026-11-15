import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconDownload, IconInfoCircle } from '@tabler/icons-react';
import {
  archiveNodeSchema,
  isRebuildable,
  type ArchiveNode,
  type EncodingVariant,
} from '@shared/domain/archive';
import { formatBytes } from '@shared/lib/bytes';
import { archiveNameFor, downloadBlob } from '@shared/lib/download';
import { takeHandoff } from '@shared/state/handoff';
import {
  ArchiveTreeView,
  ErrorPanel,
  PageHeader,
  RunControls,
  SectionCard,
  TreeSummary,
  VariantSelect,
} from '@shared/ui';
import { useRebuild } from '../api/useRebuild';

interface ParsedTree {
  root: ArchiveNode | null;
  error: string | null;
}

function parseTree(source: string): ParsedTree {
  const trimmed = source.trim();
  if (trimmed === '') {
    return { root: null, error: null };
  }

  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch (error) {
    return { root: null, error: error instanceof Error ? error.message : 'Invalid JSON.' };
  }

  const candidate =
    typeof json === 'object' && json !== null && 'root' in json
      ? (json as { root: unknown }).root
      : json;

  const parsed = archiveNodeSchema.safeParse(candidate);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join('.') ?? '(root)';
    return { root: null, error: `${where}: ${first?.message ?? 'does not match the tree schema'}` };
  }

  return { root: parsed.data, error: null };
}

export function RebuildPage() {
  const [source, setSource] = useState('');
  const [variant, setVariant] = useState<EncodingVariant>('STANDARD');
  const rebuild = useRebuild();

  useEffect(() => {
    const pending = takeHandoff();
    if (pending?.kind === 'tree') {
      setSource(JSON.stringify({ root: pending.root }, null, 2));
      notifications.show({
        title: 'Tree loaded',
        message: `${pending.label} is ready to edit.`,
        color: 'teal',
      });
    }
  }, []);

  const parsed = useMemo(() => parseTree(source), [source]);
  const complete = parsed.root !== null && isRebuildable(parsed.root);

  const run = (): void => {
    if (!parsed.root) {
      return;
    }
    rebuild.mutate({ root: parsed.root, variant });
  };

  const result = rebuild.data;

  return (
    <Stack gap="lg">
      <PageHeader
        title="Rebuild"
        endpoint="POST /rebuild"
        description="Assemble a .zip from a JSON tree. Paste the output of Explode, edit it, and send it back - every file entry needs Base64 content for its bytes to survive."
      />

      <SectionCard
        title="Archive tree"
        subtitle="A bare node or the { root: ... } envelope from Explode are both accepted."
        actions={
          source === '' ? null : (
            <Button size="xs" variant="subtle" color="gray" onClick={() => setSource('')}>
              Clear
            </Button>
          )
        }
      >
        <Stack gap="xs">
          <Textarea
            value={source}
            onChange={(event) => setSource(event.currentTarget.value)}
            placeholder='{ "root": { "type": "DIRECTORY", "name": "", "path": "", "children": [] } }'
            minRows={10}
            maxRows={22}
            autosize
            disabled={rebuild.isPending}
            error={parsed.error}
            styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
          />

          {parsed.root && !parsed.error ? (
            <Group gap="xs">
              <IconCheck size={16} />

              <Text size="xs" c="dimmed">
                Valid tree.
              </Text>
            </Group>
          ) : null}
        </Stack>
      </SectionCard>

      {parsed.root ? (
        <SectionCard title="Preview">
          <Stack gap="md">
            <TreeSummary root={parsed.root} />
            {complete ? null : (
              <Alert
                color="yellow"
                variant="light"
                icon={<IconAlertTriangle size={18} />}
                title="Some entries have no content"
              >
                <Text size="sm">
                  Entries marked &quot;metadata only&quot; carry no Base64 content and will be
                  written as empty files. This is what happens when a tree comes from Inspect rather
                  than Explode.
                </Text>
              </Alert>
            )}

            <ArchiveTreeView root={parsed.root} />
          </Stack>
        </SectionCard>
      ) : null}

      <SectionCard title="Options">
        <Stack gap="md">
          <VariantSelect
            value={variant}
            onChange={setVariant}
            disabled={rebuild.isPending}
            label="Base64 variant of the entry content"
          />

          <RunControls
            label="Rebuild"
            onRun={run}
            onCancel={rebuild.cancel}
            running={rebuild.isPending}
            disabled={parsed.root === null}
            upload={rebuild.progress.upload}
            download={rebuild.progress.download}
          />
        </Stack>
      </SectionCard>

      {rebuild.error ? <ErrorPanel error={rebuild.error} onRetry={run} /> : null}

      {result ? (
        <SectionCard
          title="Rebuilt archive"
          actions={
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={() => downloadBlob(result.blob, archiveNameFor(result.filename, 'rebuilt.zip'))}
            >
              Download
            </Button>
          }
        >
          <Stack gap="sm">
            <Text size="sm">
              {formatBytes(result.blob.size)} written to{' '}
              <b>{archiveNameFor(result.filename, 'rebuilt.zip')}</b>.
            </Text>

            <Alert variant="light" color="blue" icon={<IconInfoCircle size={18} />} title="Not byte-identical by design">
              <Text size="sm">
                The rebuilt archive holds the same entries and the same content, but compression
                settings and timestamps are applied fresh, so its SHA-256 will not match the
                original. Compare the extracted contents, not the archive digest.
              </Text>
            </Alert>
          </Stack>
        </SectionCard>
      ) : null}
    </Stack>
  );
}