import { useState } from 'react';
import { Alert, Button, Code, Group, Stack, Text } from '@mantine/core';
import { IconCheck, IconCopy, IconDownload, IconInfoCircle } from '@tabler/icons-react';
import { copyText, describeClipboardOutcome } from '@shared/lib/clipboard';
import { EM_DASH, formatCount } from '@shared/lib/bytes';
import type { PreviewResult } from '@shared/lib/preview';

export interface Base64PreviewProps {
  preview: PreviewResult;
  onDownload?: () => void;
  downloadLabel?: string;
  /** Full payload, when it is small enough to have been kept in memory. */
  fullText?: string | null;
}

/**
 * shows a bounded window onto a base64 payload
 */
export function Base64Preview({
  preview,
  onDownload,
  downloadLabel = 'Download .b64',
  fullText = null,
}: Base64PreviewProps) {
  const [copyState, setCopyState] = useState<string | null>(null);

  const handleCopy = async (): Promise<void> => {
    if (fullText === null) {
      setCopyState('The payload was streamed and never held in memory. Download it instead.');
      return;
    }
    const outcome = await copyText(fullText);
    setCopyState(describeClipboardOutcome(outcome));
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" c="dimmed">
          {preview.totalChars === null
            ? EM_DASH
            : `${formatCount(preview.totalChars)} characters total`}
          {preview.truncated ? ` - showing the first ${formatCount(preview.text.length)}` : ''}
        </Text>

        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            leftSection={copyState === null ? <IconCopy size={14} /> : <IconCheck size={14} />}
            onClick={() => {
              void handleCopy();
            }}
          >
            Copy
          </Button>

          {onDownload ? (
            <Button size="xs" leftSection={<IconDownload size={14} />} onClick={onDownload}>
              {downloadLabel}
            </Button>
          ) : null}
        </Group>
      </Group>

      <Code
        block
        style={{
          maxHeight: 280,
          overflow: 'auto',
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
        }}
      >
        {preview.text}
        {preview.truncated ? '\n…' : ''}
      </Code>

      {preview.truncated ? (
        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          <Text size="sm">
            Only a preview is rendered. Use the download button to get the complete payload - the
            full value is far too large to display or paste safely.
          </Text>
        </Alert>
      ) : null}
      
      {copyState ? (
        <Text size="xs" c="dimmed">
          {copyState}
        </Text>
      ) : null}
    </Stack>
  );
}