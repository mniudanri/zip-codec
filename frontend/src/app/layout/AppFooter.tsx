import { ActionIcon, Anchor, Divider, Group, Stack, Text, Tooltip } from '@mantine/core';
import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconMail,
  IconCoffee,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';
import { author, contactLinks, type ContactLink } from '@shared/config/author';

const ICONS: Record<ContactLink['id'], ComponentType<{ size?: number; stroke?: number }>> = {
  github: IconBrandGithub,
  linkedin: IconBrandLinkedin,
  whatsapp: IconBrandWhatsapp,
  email: IconMail,
};

/**
 * contact row shown at the footer of every page
 */
export function AppFooter() {
  return (
    <Stack gap="sm" mt="xl">
      <Divider />
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Group gap={6} wrap="nowrap">
          <IconCoffee size={16} stroke={1.5} />
          <Text size="sm" c="dimmed">
            Built by{' '}
            
            <Anchor href={author.repositoryUrl} target="_blank" rel="noopener noreferrer" size="sm">
              {author.name}
            </Anchor>

            {' \u00b7 '}

            {author.tagline}
          </Text>
        </Group>

        <Group gap="xs">
          {contactLinks.map((link) => {
            const Icon = ICONS[link.id];
            return (
              <Tooltip key={link.id} label={link.description} withArrow>
                <ActionIcon
                  component="a"
                  href={link.href}
                  target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label={`${link.label}: ${link.description}`}
                >
                  <Icon size={18} stroke={1.5} />
                </ActionIcon>
              </Tooltip>
            );
          })}
        </Group>
      </Group>
    </Stack>
  );
}