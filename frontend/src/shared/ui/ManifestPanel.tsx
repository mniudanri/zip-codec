import { Badge, CopyButton, Group, Stack, Table, Text, Tooltip, ActionIcon } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import type { ArchiveManifest } from '@shared/domain/archive';
import { EM_DASH, formatBytes, formatCount } from '@shared/lib/bytes';
export interface ManifestPanelProps {
  manifest: ArchiveManifest;
  // shown when the manifest came from "X-Archive" headers rather than a JSON body
  source?: 'body' | 'headers';
}

interface Row {
  label: string;
  value: string;
  copyable?: string;
  mono?: boolean;
}

export function ManifestPanel({ manifest, source = 'body' }: ManifestPanelProps) {
  const rows: Row[] = [
    { label: 'Filename', value: manifest.filename ?? EM_DASH },
    { label: 'Archive size', value: formatBytes(manifest.sizeBytes) },
    { label: 'Entries', value: formatCount(manifest.entryCount) },
    { label: 'Max depth', value: formatCount(manifest.maxDepth) },
    { label: 'Variant', value: manifest.variant ?? EM_DASH, mono: true },
    {
      label: 'Base64 length',
      value:
        manifest.base64Length === null || manifest.base64Length === undefined
          ? EM_DASH
          : `${formatCount(manifest.base64Length)} chars`,
    },
    { label: 'Entry name charset', value: manifest.entryNameCharset ?? EM_DASH, mono: true },
    {
      label: 'SHA-256',
      value: manifest.sha256 ?? EM_DASH,
      mono: true,
      ...(manifest.sha256 ? { copyable: manifest.sha256 } : {}),
    },
  ];

  return (
    <Stack gap="xs">
      {source === 'headers' ? (
        <Group gap="xs">
          <Badge variant="light" color="grape">
            from response headers
          </Badge>

          <Text size="xs" c="dimmed">
            The streaming endpoint reports the manifest in <code>X-Archive-*</code> headers so the
            body stays a pure Base64 stream.
          </Text>
        </Group>
      ) : null}

      <Table withTableBorder withRowBorders verticalSpacing="xs" horizontalSpacing="md">
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.label}>
              <Table.Th w={180}>{row.label}</Table.Th>
              <Table.Td>
                <Group gap="xs" wrap="nowrap">
                  <Text
                    size="sm"
                    style={row.mono ? { fontFamily: 'monospace', wordBreak: 'break-all' } : undefined}
                  >
                    {row.value}
                  </Text>

                  {row.copyable ? (
                    <CopyButton value={row.copyable} timeout={1500}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied' : 'Copy'}>
                          <ActionIcon
                            variant="subtle"
                            color={copied ? 'teal' : 'gray'}
                            onClick={copy}
                            aria-label={`Copy ${row.label}`}
                          >
                            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  ) : null}
                  
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}