import { useState } from 'react';
import { Alert, Button, Group, Stack, Switch, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconArrowRight, IconFileDownload } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { env, MAX_INLINE_ARCHIVE_BYTES } from '@shared/config/env';
import { routePaths } from '@shared/config/modes';
import type { EncodingVariant, FileNode } from '@shared/domain/archive';
import { formatBytes } from '@shared/lib/bytes';
import { base64ToBlob, downloadBlob, downloadJson, stripExtension } from '@shared/lib/download';
import { setHandoff } from '@shared/state/handoff';
import {
  ArchiveDropzone,
  ArchiveTreeView,
  ErrorPanel,
  FilePreviewModal,
  ManifestPanel,
  PageHeader,
  RunControls,
  SectionCard,
  TreeSummary,
  VariantSelect,
} from '@shared/ui';
import { useExplode } from '../api/useExplode';

export function ExplodePage() {
  const [file, setFile] = useState<File | null>(null);
  const [recurse, setRecurse] = useState(false);
  const [variant, setVariant] = useState<EncodingVariant>('STANDARD');
  const [previewNode, setPreviewNode] = useState<FileNode | null>(null);
  const navigate = useNavigate();
  const explode = useExplode();

  const heavy = file !== null && file.size > MAX_INLINE_ARCHIVE_BYTES / 4;

  const run = (): void => {
    if (!file) {
      return;
    }
    explode.mutate({ file, recurse, variant });
  };

  const result = explode.data;

  const downloadEntry = (node: FileNode): void => {
    if (!node.content) {
      return;
    }
    downloadBlob(base64ToBlob(node.content, node.mimeType), node.name);
  };

  const sendToRebuild = (): void => {
    if (!result) {
      return;
    }

    setHandoff({ kind: 'tree', label: result.sourceName, root: result.root });

    notifications.show({
      title: 'Sent to Rebuild',
      message: 'The tree is loaded on the rebuild page, ready to edit.',
      color: 'teal',
    });
    
    void navigate(routePaths.rebuild);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Explode"
        endpoint="POST /explode"
        description="Expand an archive into a JSON tree where every file carries its own Base64 content. This is the form to edit before rebuilding - if you only need to see what is inside, Inspect is far cheaper."
      />

      <SectionCard title="Source archive" subtitle={`Limit ${formatBytes(env.VITE_MAX_UPLOAD_BYTES, 0)}.`}>
        <ArchiveDropzone
          value={file}
          onChange={setFile}
          maxSize={env.VITE_MAX_UPLOAD_BYTES}
          disabled={explode.isPending}
          onRejected={(message) =>
            notifications.show({ title: 'File rejected', message, color: 'red' })
          }
        />
      </SectionCard>

      <SectionCard title="Options">
        <Stack gap="md">
          <Switch
            label="Recurse into nested archives"
            description="Expands a .zip found inside the archive as a directory instead of treating it as a single file."
            checked={recurse}
            onChange={(event) => setRecurse(event.currentTarget.checked)}
            disabled={explode.isPending}
          />

          <VariantSelect
            value={variant}
            onChange={setVariant}
            disabled={explode.isPending}
            label="Base64 variant for entry content"
          />

          {heavy ? (
            <Alert
              color="yellow"
              variant="light"
              icon={<IconAlertTriangle size={18} />}
              title="This response will be large"
            >
              <Text size="sm">
                Every entry is returned with its Base64 content, so the JSON response will be
                noticeably bigger than the {formatBytes(file.size)} archive itself and is parsed
                entirely in memory. Use Inspect if you only need the structure.
              </Text>
            </Alert>
          ) : null}

          <RunControls
            label="Explode"
            onRun={run}
            onCancel={explode.cancel}
            running={explode.isPending}
            disabled={file === null}
            upload={explode.progress.upload}
            download={explode.progress.download}
          />
        </Stack>
      </SectionCard>

      {explode.error ? <ErrorPanel error={explode.error} onRetry={run} /> : null}

      {result ? (
        <>
          <SectionCard title="Manifest">
            <ManifestPanel manifest={result.manifest} />
          </SectionCard>

          <SectionCard
            title="Contents"
            subtitle="Entries with content can be previewed or downloaded individually."
            actions={
              <Group gap="xs">
                <Button
                  variant="light"
                  leftSection={<IconFileDownload size={16} />}
                  onClick={() =>
                    downloadJson(
                      { root: result.root, variant },
                      `${stripExtension(result.sourceName)}-tree.json`,
                    )
                  }
                >
                  Download JSON
                </Button>
                <Button rightSection={<IconArrowRight size={16} />} onClick={sendToRebuild}>
                  Send to Rebuild
                </Button>
              </Group>
            }
          >
            <Stack gap="md">
              <TreeSummary root={result.root} />
              <ArchiveTreeView
                root={result.root}
                onDownloadFile={downloadEntry}
                onPreviewFile={setPreviewNode}
              />
            </Stack>
          </SectionCard>

          <FilePreviewModal
            node={previewNode}
            onClose={() => setPreviewNode(null)}
            onDownload={downloadEntry}
          />
        </>
      ) : null}
    </Stack>
  );
}