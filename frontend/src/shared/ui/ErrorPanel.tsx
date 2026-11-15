import { Alert, Button, Code, Collapse, Group, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { isApiError, remediationFor } from '@shared/api/ApiError';

export interface ErrorPanelProps {
  error: unknown;
  onRetry?: () => void;
}

/**
 * renders a failure as something a user can act on
 */
export function ErrorPanel({ error, onRetry }: ErrorPanelProps) {
  const [detailOpen, detail] = useDisclosure(false);
  if (error === null || error === undefined) {
    return null;
  }

  if (isApiError(error) && error.isAborted) {
    return (
      <Alert color="gray" variant="light" title="Request cancelled">
        <Text size="sm">The transfer was stopped before it finished. Nothing was changed.</Text>
      </Alert>
    );
  }

  const title = isApiError(error) ? error.title : 'Something went wrong';
  const message = error instanceof Error ? error.message : String(error);
  const remediation = remediationFor(error);
  const violation = isApiError(error) ? error.violation : undefined;
  const problem = isApiError(error) ? error.problem : undefined;
  
  return (
    <Alert
      color="red"
      variant="light"
      title={title}
      icon={<IconAlertTriangle size={18} />}
      role="alert"
    >
      <Stack gap="sm">
        <Text size="sm">{message}</Text>
        {violation ? (
          <Text size="xs" c="dimmed">
            Violation code: <Code>{violation}</Code>
          </Text>
        ) : null}

        {remediation ? (
          <Text size="sm" fw={500}>
            {remediation}
          </Text>
        ) : null}

        <Group gap="xs">
          {onRetry ? (
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconRefresh size={14} />}
              onClick={onRetry}
            >
              Try again
            </Button>
          ) : null}

          {problem ? (
            <Button size="xs" variant="subtle" color="gray" onClick={detail.toggle}>
              {detailOpen ? 'Hide raw response' : 'Show raw response'}
            </Button>
          ) : null}
        </Group>
        
        {problem ? (
          <Collapse in={detailOpen}>
            <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(problem, null, 2)}
            </Code>
          </Collapse>
        ) : null}
      </Stack>
    </Alert>
  );
}