import type { ReactNode } from 'react';
import { Group, Stack, Text, Title } from '@mantine/core';

export interface PageHeaderProps {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Stack gap="xs" mb="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Title order={2}>{title}</Title>

        {actions}
      </Group>
      
      <Text c="dimmed" size="sm" maw={760}>
        {description}
      </Text>
    </Stack>
  );
}