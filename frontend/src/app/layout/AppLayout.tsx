import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Text,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconFileZip, IconMoon, IconSun } from '@tabler/icons-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { navRoutes } from '@app/router/routes';
import { BackendStatus } from './BackendStatus';
import { AppFooter } from './AppFooter';

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const next = computed === 'dark' ? 'light' : 'dark';
  
  return (
    <Tooltip label={`Switch to ${next} theme`}>
      <ActionIcon
        variant="default"
        size="lg"
        onClick={() => setColorScheme(next)}
        aria-label={`Switch to ${next} theme`}
      >
        {computed === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}

export function AppLayout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AppShell
      header={{ height: 60 }}
      footer={{ height: { base: 52, sm: 56 }}}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !mobileOpened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <IconFileZip size={24} stroke={1.5} />
            <Title order={4}>ZIP Codec Console</Title>
          </Group>
          <Group gap="sm" wrap="nowrap">
            <BackendStatus />
            <ColorSchemeToggle />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          {navRoutes.map((route) => {
            const Icon = route.icon;
            return (
              <NavLink
                key={route.path}
                active={location.pathname === route.path}
                label={route.label}
                description={route.description}
                leftSection={<Icon size={18} stroke={1.5} />}
                onClick={() => {
                  void navigate(route.path);
                  closeMobile();
                }}
              />
            );
          })}
        </AppShell.Section>

        <AppShell.Section>
          <Text size="xs" c="dimmed">
            Streaming modes keep memory flat. Inline modes are easier to read but hold the whole
            payload in RAM.
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer>
        <AppFooter />
      </AppShell.Footer>
    </AppShell>
  );
}