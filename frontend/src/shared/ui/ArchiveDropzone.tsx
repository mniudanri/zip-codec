import { Dropzone, type FileRejection } from '@mantine/dropzone';
import { ActionIcon, Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconFileZip, IconUpload, IconX } from '@tabler/icons-react';
import { formatBytes } from '@shared/lib/bytes';


/**
 * API response content type accepted
 */
const ZIP_ACCEPT = {
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
  'application/octet-stream': ['.zip'],
};

export interface ArchiveDropzoneProps {
  value: File | null;
  onChange: (file: File | null) => void;
  maxSize: number;
  disabled?: boolean;
  accept?: Record<string, string[]>;
  label?: string;
  hint?: string;
  onRejected?: (message: string) => void;
}

export function ArchiveDropzone({
  value,
  onChange,
  maxSize,
  disabled = false,
  accept = ZIP_ACCEPT,
  label = 'Drop a .zip archive here, or click to browse',
  hint,
  onRejected,
}: ArchiveDropzoneProps) {

  const handleDrop = (files: File[]): void => {
    onChange(files[0] ?? null);
  };

  const handleReject = (rejections: FileRejection[]): void => {
    const first = rejections[0];
    if (!first) {
      return;
    }
    const reason = first.errors[0]?.code === 'file-too-large'
        ? `is larger than the ${formatBytes(maxSize, 0)} limit`
        : 'is not a .zip archive';
    onChange(null);
    
    console.warn(`Rejected ${first.file.name}: ${reason}`);
  };

  if (value) {
    return (
      <Group
        justify="space-between"
        wrap="nowrap"
        p="md"
        style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}
      >
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <IconFileZip size={28} stroke={1.5} />
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text fw={500} truncate>
              {value.name}
            </Text>

            <Text size="xs" c="dimmed">
              {formatBytes(value.size)}
            </Text>
          </Stack>
        </Group>

        <Tooltip label="Remove file">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label="Remove selected file"
          >
            <IconX size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  }

  return (
    <Dropzone
      onDrop={handleDrop}
      onReject={handleReject}
      maxSize={maxSize}
      accept={accept}
      multiple={false}
      disabled={disabled}
      radius="md"
    >
      <Stack align="center" gap="xs" mih={140} justify="center" style={{ pointerEvents: 'none' }}>
        <IconUpload size={36} stroke={1.3} />
        <Text fw={500}>{label}</Text>

        <Group gap="xs">
          <Badge variant="light" color="gray">
            max {formatBytes(maxSize, 0)}
          </Badge>
          {hint ? (
            <Text size="xs" c="dimmed">
              {hint}
            </Text>
          ) : null}
        </Group>
      </Stack>
    </Dropzone>
  );
}