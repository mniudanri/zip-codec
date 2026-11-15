import { useMemo } from 'react';
import { Group, Paper, Stack, Text } from '@mantine/core';
import { summarizeTree, type ArchiveNode } from '@shared/domain/archive';
import { formatBytes, formatCount } from '@shared/lib/bytes';

export interface TreeSummaryProps {
  root: ArchiveNode;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={0} miw={110}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="lg" fw={600}>
        {value}
      </Text>
    </Stack>
  );
}

export function TreeSummary({ root }: TreeSummaryProps) {
  const totals = useMemo(() => summarizeTree(root), [root]);
  return (
    <Paper withBorder radius="md" p="md">
      <Group gap="xl">
        <Stat label="Directories" value={formatCount(totals.directories)} />
        <Stat label="Files" value={formatCount(totals.files)} />
        <Stat label="Uncompressed" value={formatBytes(totals.bytes)} />
        <Stat label="With content" value={`${formatCount(totals.withContent)} / ${formatCount(totals.files)}`} />
      </Group>
    </Paper>
  );
}