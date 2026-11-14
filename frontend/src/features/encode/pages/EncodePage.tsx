import { useState } from 'react';
import {
  Alert,
  Button,
  Group,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { env, MAX_INLINE_ARCHIVE_BYTES } from '@shared/config/env';
import { routePaths } from '@shared/config/modes';
import type { EncodingVariant } from '@shared/domain/archive';
import { base64NameFor, downloadBlob } from '@shared/lib/download';
import { formatBytes } from '@shared/lib/bytes';
import { setHandoff } from '@shared/state/handoff';
import {
  ArchiveDropzone,
  Base64Preview,
  ErrorPanel,
  ManifestPanel,
  PageHeader,
  RunControls,
  SectionCard,
  VariantSelect,
} from '@shared/ui';
import { useEncode, type EncodeMode } from '../api/useEncode';

export function EncodePage() {
  const [file, setFile] = useState<File | null>(null);
  const [variant, setVariant] = useState<EncodingVariant>('STANDARD');
  const [mode, setMode] = useState<EncodeMode>('stream');
  const navigate = useNavigate();
  const encode = useEncode();
  const inlineTooBig = mode === 'inline' && file !== null && file.size > MAX_INLINE_ARCHIVE_BYTES;
  const run = (): void => {
    if (!file) {
      return;
    }
    encode.mutate({ file, variant, mode });
  };

  const result = encode.data;
  const sendToDecode = (): void => {
    if (!result) {
      return;
    }
    setHandoff({
      kind: 'base64',
      label: base64NameFor(result.sourceName),
      blob: result.blob,
      sha256: result.manifest.sha256 ?? null,
      variant: result.manifest.variant ?? variant,
    });

    notifications.show({
      title: 'Sent to Decode',
      message: 'The Base64 payload is waiting on the decode page.',
      color: 'teal',
    });
    void navigate(routePaths.decode);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Encode"
        endpoint={mode === 'stream' ? 'POST /encode/stream' : 'POST /encode'}
        description="Upload a .zip and get its Base64 representation. Streaming returns the payload as a download with the manifest in response headers; inline returns a JSON envelope containing the whole string."
      />
      <SectionCard title="Source archive" subtitle={`Limit ${formatBytes(env.VITE_MAX_UPLOAD_BYTES, 0)}.`}>
        <ArchiveDropzone
          value={file}
          onChange={setFile}
          maxSize={env.VITE_MAX_UPLOAD_BYTES}
          disabled={encode.isPending}
          onRejected={(message) =>
            notifications.show({ title: 'File rejected', message, color: 'red' })
          }
        />
      </SectionCard>

      <SectionCard title="Options">
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Mode
            </Text>

            <SegmentedControl
              value={mode}
              onChange={(value) => setMode(value as EncodeMode)}
              disabled={encode.isPending}
              data={[
                { label: 'Streaming (recommended)', value: 'stream' },
                { label: 'Inline JSON', value: 'inline' },
              ]}
              w="fit-content"
            />

            <Text size="xs" c="dimmed">
              {mode === 'stream'
                ? 'The response body is pure Base64 and never has to be held in memory on either side.'
                : 'The whole Base64 string is parsed into a JavaScript string. Convenient for small archives, expensive for large ones.'}
            </Text>
          </Stack>

          <VariantSelect value={variant} onChange={setVariant} disabled={encode.isPending} />
          
          {inlineTooBig ? (
            <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />} title="Inline mode is a poor fit for this file">
              <Text size="sm">
                {formatBytes(file.size)} encodes to roughly{' '}
                {formatBytes(Math.ceil(file.size / 3) * 4)} of text. Parsing that into a single
                JavaScript string can freeze the tab. Switch to streaming unless you specifically
                need the JSON envelope.
              </Text>
            </Alert>
          ) : null}

          <RunControls
            label="Encode"
            onRun={run}
            onCancel={encode.cancel}
            running={encode.isPending}
            disabled={file === null}
            upload={encode.progress.upload}
            download={encode.progress.download}
          />
        </Stack>
      </SectionCard>
      
      {encode.error ? <ErrorPanel error={encode.error} onRetry={run} /> : null}
      {result ? (
        <>
          <SectionCard title="Manifest">
            <ManifestPanel
              manifest={result.manifest}
              source={result.mode === 'stream' ? 'headers' : 'body'}
            />
          </SectionCard>
          
          <SectionCard
            title="Base64 payload"
            actions={
              <Button
                variant="light"
                rightSection={<IconArrowRight size={16} />}
                onClick={sendToDecode}
              >
                Send to Decode
              </Button>
            }
          >
            <Base64Preview
              preview={result.preview}
              fullText={result.fullText}
              onDownload={() => downloadBlob(result.blob, base64NameFor(result.sourceName))}
            />
          </SectionCard>
        </>
      ) : null}
    </Stack>
  );
}