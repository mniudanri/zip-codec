import { Alert, Button, Card, Group, List, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconArrowRight, IconInfoCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { operationModes } from '@shared/config/modes';
import { PageHeader, SectionCard } from '@shared/ui';


export function HomePage() {
  const navigate = useNavigate();

  return (
    <Stack gap="xl">
      <PageHeader
        title="ZIP Codec Console"
        description="A website for ZIP Codec Service: convert archives to Base64 and back, expand them into an editable JSON tree, and reassemble them again."
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {operationModes.map((mode) => {
          const Icon = mode.icon;
          return (
            <Card key={mode.id} withBorder radius="md" padding="lg">
              <Stack gap="sm" h="100%" justify="space-between">
                <Stack gap="sm">
                  <Group gap="sm">
                    <ThemeIcon variant="light" size="lg" radius="md">
                      <Icon size={20} stroke={1.5} />
                    </ThemeIcon>

                    <Text fw={600}>{mode.label}</Text>

                  </Group>

                  <Text size="sm" c="dimmed">
                    {mode.description}
                  </Text>
                </Stack>

                <Button
                  variant="light"
                  rightSection={<IconArrowRight size={16} />}
                  onClick={() => {
                    void navigate(mode.path);
                  }}
                >
                  Open {mode.label.toLowerCase()}
                </Button>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>

      <SectionCard
        title="Choosing a mode"
        subtitle="The difference that matters most is whether the whole payload has to fit in memory."
      >
        <List spacing="xs" size="sm">
          <List.Item>
            <b>Moving an archive through a text-only channel</b> - use Encode, then Decode on the
            far side. Prefer the streaming option for anything large.
          </List.Item>

          <List.Item>
            <b>Looking at what is inside</b> - use Inspect. It returns structure only, so the
            response stays small even for a large archive.
          </List.Item>

          <List.Item>
            <b>Changing what is inside</b> - use Explode to get a JSON tree with per-entry content,
            edit it, then Rebuild.
          </List.Item>
        </List>
      </SectionCard>

      <Alert variant="light" color="blue" icon={<IconInfoCircle size={18} />} title="Two things worth knowing up front">
        <List spacing="xs" size="sm">
          <List.Item>
            Base64 grows a payload by about a third. A 25 MB archive becomes roughly 33 million
            characters, which is a file rather than something to paste - the inline modes warn you
            before you get there.
          </List.Item>
          
          <List.Item>
            A rebuilt archive is not byte-identical to the original. It contains the same entries
            and the same content, but compression settings and timestamps are reapplied, so its
            SHA-256 will differ.
          </List.Item>
        </List>
      </Alert>
    </Stack>
  );
}