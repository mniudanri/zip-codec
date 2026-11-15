import { Button, Group, Progress, Stack, Text } from '@mantine/core';
import { IconPlayerStop, IconPlayerPlay } from '@tabler/icons-react';
import type { TransferProgress } from '@shared/api/httpClient';
import { formatBytes } from '@shared/lib/bytes';

export interface RunControlsProps {
  label: string;
  onRun: () => void;
  onCancel: () => void;
  running: boolean;
  disabled?: boolean;
  upload?: TransferProgress | null;
  download?: TransferProgress | null;
}

function ProgressRow({ title, progress }: { title: string; progress: TransferProgress }) {
  const indeterminate = progress.percent === null;
  return (
    <Stack gap={4}>
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {title}
        </Text>

        <Text size="xs" c="dimmed">
          {formatBytes(progress.loaded)}
          {progress.total === null ? '' : ` / ${formatBytes(progress.total)}`}
        </Text>
      </Group>
      
      <Progress value={progress.percent ?? 100} animated={indeterminate} striped={indeterminate} />
    </Stack>
  );
}

/**
 * Run / cancel plus live transfer feedback.
 *
 * Cancellation is first-class here because these requests are long: an operator
 * who drops the wrong 200 MB archive should not have to wait out the timeout.
 */
export function RunControls({
  label,
  onRun,
  onCancel,
  running,
  disabled = false,
  upload = null,
  download = null,
}: RunControlsProps) {

  return (
    <Stack gap="sm">
      <Group gap="sm">
        <Button
          onClick={onRun}
          loading={running}
          disabled={disabled || running}
          leftSection={<IconPlayerPlay size={16} />}
        >
          {label}
        </Button>
        {running ? (
          <Button
            variant="light"
            color="red"
            onClick={onCancel}
            leftSection={<IconPlayerStop size={16} />}
          >
            Cancel
          </Button>
        ) : null}
      </Group>
      {upload ? <ProgressRow title="Uploading" progress={upload} /> : null}
      {download ? <ProgressRow title="Receiving" progress={download} /> : null}
    </Stack>
  );
}