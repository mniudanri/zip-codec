import { useQuery } from '@tanstack/react-query';
import { Badge, Group, Loader, Text, Tooltip } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { archiveApi } from '@shared/api/archiveClient';

/**
 * check backend status. backend used spring boot with health check api,
 * GET /actuator/health
 *
 * avoid failed process seems looks like a bug in uploading zip rather than 
 * a service that was never started, which is the most common cause of a failed first run.
 */
export function BackendStatus() {
    
  const { data, isPending, error } = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => archiveApi.health({ signal }),
    refetchInterval: 30_000,
  });

  if (isPending) {
    return (
      <Group gap="xs">
        <Loader size="xs" />
        <Text size="xs" c="dimmed">
          checking backend
        </Text>
      </Group>
    );
  }

  if (error) {
    return (
      <Tooltip multiline w={280} label="Wait till the server is up and come back later.">
        <Badge
          color="red"
          variant="light"
          style={{ cursor: 'help' }}
          leftSection={<IconEye size={12} className="blink-eye" />}
        >
          backend unreachable
        </Badge>
      </Tooltip>
    );
  }

  const up = data.status.toUpperCase() === 'UP';
  return (
    <Tooltip
      label={
        up
          ? 'All good - the server is awake and listening.'
          : `The server answered, but it is not quite ready yet (${data.status}).`
      }
    >
      <Badge color={up ? 'teal' : 'yellow'} variant="light" style={{ cursor: 'help' }}>
        backend {data.status.toLowerCase()}
      </Badge>
    </Tooltip>
  );
}