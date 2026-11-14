import { useQuery } from '@tanstack/react-query';
import { Badge, Group, Loader, Text, Tooltip } from '@mantine/core';
import { archiveApi } from '@shared/api/archiveClient';
import { isApiError } from '@shared/api/ApiError';
import { env } from '@shared/config/env';

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
    const detail = isApiError(error)
      ? error.message
      : 'The health endpoint could not be reached.';
      
    return (
      <Tooltip
        multiline
        w={320}
        label={`${detail} Start the service with "mvn spring-boot:run" and make sure it is listening on port 8080.`}
      >
        <Badge color="red" variant="light" style={{ cursor: 'help' }}>
          backend unreachable
        </Badge>
      </Tooltip>
    );
  }

  const up = data.status.toUpperCase() === 'UP';
  return (
    <Tooltip label={`${env.VITE_HEALTH_URL} reported ${data.status}`}>
      <Badge color={up ? 'teal' : 'yellow'} variant="light" style={{ cursor: 'help' }}>
        backend {data.status.toLowerCase()}
      </Badge>
    </Tooltip>
  );
}