import { useState } from 'react';
import { Alert, Button, Stack, Switch, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconFileDownload, IconInfoCircle } from '@tabler/icons-react';
import { env } from '@shared/config/env';
import { formatBytes } from '@shared/lib/bytes';
import { downloadJson, stripExtension } from '@shared/lib/download';
import {
  ArchiveDropzone,
  ArchiveTreeView,
  ErrorPanel,
  ManifestPanel,
  PageHeader,
  RunControls,
  SectionCard,
  TreeSummary,
} from '@shared/ui';
import { useInspect } from '../api/useInspect';

export function InspectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [recurse, setRecurse] = useState(false);
  const inspect = useInspect();

  const run = (): void => {
    if (!file) {
      return;
    }
    inspect.mutate({ file, recurse });
  };

  const result = inspect.data;

  return (
    <Stack gap="lg">
      <PageHeader
        title="Inspect"
        endpoint="POST /inspect"
        description="List what an archive contains without carrying any file content. The response stays small no matter how large the archive is, which makes this the safe way to look inside something unfamiliar."
      />

      <SectionCard title="Source archive" subtitle={`Limit ${formatBytes(env.VITE_MAX_UPLOAD_BYTES, 0)}.`}>
        <ArchiveDropzone
          value={file}
          onChange={setFile}
          maxSize={env.VITE_MAX_UPLOAD_BYTES}
          disabled={inspect.isPending}
          onRejected={(message) =>
            notifications.show({ title: 'File rejected', message, color: 'red' })
          }
        />
      </SectionCard>

      <SectionCard title="Options">
        <Stack gap="md">
          <Switch
            label="Recurse into nested archives"
            description="Reads the structure of archives stored inside this one."
            checked={recurse}
            onChange={(event) => setRecurse(event.currentTarget.checked)}
            disabled={inspect.isPending}
          />

          <RunControls
            label="Inspect"
            onRun={run}
            onCancel={inspect.cancel}
            running={inspect.isPending}
            disabled={file === null}
            upload={inspect.progress.upload}
            download={inspect.progress.download}
          />
        </Stack>
      </SectionCard>

      {inspect.error ? <ErrorPanel error={inspect.error} onRetry={run} /> : null}

      {result ? (
        <>
          <SectionCard title="Manifest">
            <ManifestPanel manifest={result.manifest} />
          </SectionCard>

          <SectionCard
            title="Structure"
            actions={
              <Button
                variant="light"
                leftSection={<IconFileDownload size={16} />}
                onClick={() =>
                  downloadJson(
                    { root: result.root },
                    `${stripExtension(result.sourceName)}-structure.json`,
                  )
                }
              >
                Download JSON
              </Button>
            }
          >
            <Stack gap="md">
              <TreeSummary root={result.root} />
              
              <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
                <Text size="sm">
                  Every entry is marked &quot;metadata only&quot; because Inspect never returns
                  content. Use Explode if you need the bytes to edit or rebuild.
                </Text>
              </Alert>

              <ArchiveTreeView root={result.root} />
            </Stack>
          </SectionCard>
        </>
      ) : null}
    </Stack>
  );
}