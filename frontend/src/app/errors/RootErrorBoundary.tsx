import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Button, Code, Container, Stack, Text, Title } from '@mantine/core';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * handles render-time failures.
 *
 * API failures are handled per feature. this boundary exists so a bug in a single
 * page cannot leave the operator looking at a blank screen with no way to recover.
 */
export class RootErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  
  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Unhandled rendering error', error, info.componentStack);
  }

  private readonly handleReset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Title order={2}>The console hit an unexpected error</Title>

          <Alert color="red" variant="light" title={error.name}>
            <Text size="sm">{error.message}</Text>
          </Alert>

          {error.stack ? (
            <Code block style={{ whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto' }}>
              {error.stack}
            </Code>
          ) : null}

          <Button onClick={this.handleReset} w="fit-content">
            Try again
          </Button>
        </Stack>
      </Container>
    );
  }
}