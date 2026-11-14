import type { ReactNode } from 'react';
import { Badge, Group, Stack, Text, Title } from '@mantine/core';

export interface PageHeaderProps {
  title: string;
  description: ReactNode;
  endpoint?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, endpoint, actions }: PageHeaderProps) {
  return (
    <Stack gap="xs" mb="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="sm" align="center">
          <Title order={2}>{title}</Title>

          {endpoint ? (
            <Badge variant="light" color="gray" size="lg" style={{ fontFamily: 'monospace' }}>
              {endpoint}
            </Badge>
          ) : null}
        </Group>

        {actions}
      </Group>
      
      <Text c="dimmed" size="sm" maw={760}>
        {description}
      </Text>
    </Stack>
  );
}