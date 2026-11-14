import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Code,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertTriangle, IconDownload } from '@tabler/icons-react';
import type { FileNode } from '@shared/domain/archive';
import { formatBytes } from '@shared/lib/bytes';
import { buildFilePreview, sanitizeDisplayName, type FilePreview } from '@shared/lib/filePreview';

export interface FilePreviewModalProps {
  node: FileNode | null;
  onClose: () => void;
  onDownload?: (node: FileNode) => void;
}

/**
 * shows one archive entry without ever letting it execute
 */
export function FilePreviewModal({ node, onClose, onDownload }: FilePreviewModalProps) {
  const preview = useMemo<FilePreview | null>(
    () => (node ? buildFilePreview(node.content) : null),
    [node],
  );

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (preview?.kind !== 'image') {
      setImageUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(preview.blob);
    setImageUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [preview]);

  const title = node ? sanitizeDisplayName(node.name) : '';

  return (
    <Modal
      opened={node !== null}
      onClose={onClose}
      title={
        <Group gap="xs" wrap="nowrap">
          <Text fw={600} truncate>
            {title}
          </Text>
          {preview && preview.kind !== 'empty' ? (
            <Badge size="xs" variant="light">
              {formatBytes(preview.byteLength)}
            </Badge>
          ) : null}
        </Group>
      }
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        {node?.mimeType ? (
          <Text size="xs" c="dimmed">
            The archive declares this entry as <Code>{sanitizeDisplayName(node.mimeType)}</Code>.
            The preview below ignores that label and uses the actual file header instead.
          </Text>
        ) : null}

        {preview?.kind === 'empty' ? (
          <Text size="sm" c="dimmed">
            This entry has no Base64 content, so there is nothing to preview.
          </Text>
        ) : null}

        {preview?.kind === 'too-large' ? (
          <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
            <Text size="sm">
              {formatBytes(preview.byteLength)} is too large to render in the browser. Download it
              instead.
            </Text>
          </Alert>
        ) : null}

        {preview?.kind === 'image' && imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: 560, objectFit: 'contain' }}
          />
        ) : null}

        {preview?.kind === 'text' || preview?.kind === 'binary' ? (
          <>
            {preview.truncated ? (
              <Text size="xs" c="dimmed">
                Showing the first part of {formatBytes(preview.byteLength)} only.
              </Text>
            ) : null}
            <ScrollArea.Autosize mah={460}>
              <Code block style={{ whiteSpace: 'pre', fontSize: 12 }}>
                {preview.kind === 'text' ? preview.text : preview.hex}
              </Code>
            </ScrollArea.Autosize>
          </>
        ) : null}

        {onDownload && node ? (
          <Group justify="flex-end">
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={() => onDownload(node)}
            >
              Download entry
            </Button>
          </Group>
        ) : null}
      </Stack>
    </Modal>
  );
}