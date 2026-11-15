import type { ReactNode } from 'react';
import { Group, Paper, Stack, Text, Title } from '@mantine/core';

export interface SectionCardProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, subtitle, actions, children }: SectionCardProps) {
  return (
    <Paper withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2}>
            <Title order={4}>{title}</Title>
            {subtitle ? (
              <Text size="sm" c="dimmed">
                {subtitle}
              </Text>
            ) : null}
          </Stack>

          {actions}
        </Group>
        
        {children}
      </Stack>
    </Paper>
  );
}