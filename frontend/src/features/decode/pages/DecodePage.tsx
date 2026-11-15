import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCheck,
  IconDownload,
  IconInfoCircle,
} from '@tabler/icons-react';
import { env, MAX_CLIPBOARD_CHARS } from '@shared/config/env';
import type { EncodingVariant } from '@shared/domain/archive';
import { encodingVariantSchema } from '@shared/domain/archive';
import { formatBytes, formatCount } from '@shared/lib/bytes';
import { archiveNameFor, downloadBlob } from '@shared/lib/download';
import { isSubtleCryptoAvailable, isValidSha256 } from '@shared/lib/sha256';
import { takeHandoff } from '@shared/state/handoff';
import {
  ArchiveDropzone,
  ErrorPanel,
  PageHeader,
  RunControls,
  SectionCard,
  VariantSelect,
} from '@shared/ui';
import { useDecode, type DecodeMode, type DecodeSource } from '../api/useDecode';

const BASE64_ACCEPT = {
  'text/plain': ['.b64', '.txt', '.base64'],
  'application/octet-stream': ['.b64', '.base64'],
};

export function DecodePage() {
  const [tab, setTab] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [handoffBlob, setHandoffBlob] = useState<{ blob: Blob; label: string } | null>(null);
  const [variant, setVariant] = useState<EncodingVariant>('STANDARD');
  const [mode, setMode] = useState<DecodeMode>('stream');
  const [expectedSha256, setExpectedSha256] = useState('');
  const [verifyLocally, setVerifyLocally] = useState(isSubtleCryptoAvailable());
  const decode = useDecode();

  // a payload from encode page is consumed exactly once
  useEffect(() => {
    const pending = takeHandoff();
    if (pending?.kind === 'base64') {
      setHandoffBlob({ blob: pending.blob, label: pending.label });
      setTab('file');
      if (pending.sha256) {
        setExpectedSha256(pending.sha256);
      }
      const parsed = encodingVariantSchema.safeParse(pending.variant);
      if (parsed.success) {
        setVariant(parsed.data);
      }
    }
  }, []);

  const shaValid = expectedSha256.trim() === '' || isValidSha256(expectedSha256);
  
  const source: DecodeSource | null = handoffBlob
    ? { kind: 'blob', blob: handoffBlob.blob, label: handoffBlob.label }
    : tab === 'file'
      ? file
        ? { kind: 'file', file }
        : null
      : text.trim() === ''
        ? null
        : { kind: 'text', text: text.trim() };

  const run = (): void => {
    if (!source || !shaValid) {
      return;
    }
    decode.mutate({
      source,
      mode,
      variant,
      verifyLocally,
      ...(expectedSha256.trim() ? { expectedSha256: expectedSha256.trim() } : {}),
    });
  };

  const result = decode.data;
  return (
    <Stack gap="lg">
      <PageHeader
        title="Decode"
        endpoint={mode === 'stream' ? 'POST /decode/stream' : 'POST /decode'}
        description="Turn a Base64 payload back into the original .zip. Streaming sends the payload as a raw request body, which avoids ever holding it in a JavaScript string."
      />

      {handoffBlob ? (
        <Alert variant="light" color="teal" icon={<IconInfoCircle size={18} />} title="Using the payload from Encode">
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">
              {handoffBlob.label} ({formatBytes(handoffBlob.blob.size)}) was handed over directly,
              so nothing had to be written to disk.
            </Text>

            <Button size="xs" variant="subtle" onClick={() => setHandoffBlob(null)}>
              Use a different source
            </Button>
          </Group>
        </Alert>
      ) : (
        <SectionCard title="Base64 source">
          <Tabs value={tab} onChange={(value) => setTab(value === 'text' ? 'text' : 'file')}>
            <Tabs.List mb="md">
              <Tabs.Tab value="file">Upload a .b64 file</Tabs.Tab>
              <Tabs.Tab value="text">Paste Base64</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="file">
              <ArchiveDropzone
                value={file}
                onChange={setFile}
                maxSize={env.VITE_MAX_UPLOAD_BYTES}
                accept={BASE64_ACCEPT}
                disabled={decode.isPending}
                label="Drop a .b64 file here, or click to browse"
                hint="Preferred for large payloads"
                onRejected={(message) =>
                  notifications.show({ title: 'File rejected', message, color: 'red' })
                }
              />
            </Tabs.Panel>

            <Tabs.Panel value="text">
              <Stack gap="xs">
                <Textarea
                  value={text}
                  onChange={(event) => setText(event.currentTarget.value)}
                  placeholder="Paste the Base64 payload"
                  minRows={6}
                  maxRows={12}
                  autosize
                  disabled={decode.isPending}
                  styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
                />
                
                <Text size="xs" c={text.length > MAX_CLIPBOARD_CHARS ? 'orange' : 'dimmed'}>
                  {formatCount(text.length)} characters
                  {text.length > MAX_CLIPBOARD_CHARS
                    ? ' - pasting payloads this large is slow; upload the .b64 file instead.'
                    : ''}
                </Text>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </SectionCard>
      )}

      <SectionCard title="Options">
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Mode
            </Text>

            <SegmentedControl
              value={mode}
              onChange={(value) => setMode(value as DecodeMode)}
              disabled={decode.isPending}
              data={[
                { label: 'Streaming (recommended)', value: 'stream' },
                { label: 'Inline JSON', value: 'inline' },
              ]}
              w="fit-content"
            />

            <Text size="xs" c="dimmed">
              {mode === 'stream'
                ? 'The payload is sent as a plain text body. A .b64 file is uploaded directly without being read into memory.'
                : 'The payload is embedded in a JSON request, which means the whole string has to exist in memory first.'}
            </Text>
          </Stack>

          <VariantSelect value={variant} onChange={setVariant} disabled={decode.isPending} />
          
          <TextInput
            label="Expected SHA-256 (optional)"
            description="When supplied, the service refuses to return an archive whose digest does not match."
            placeholder="64 hexadecimal characters"
            value={expectedSha256}
            onChange={(event) => setExpectedSha256(event.currentTarget.value)}
            error={shaValid ? null : 'A SHA-256 digest is exactly 64 hexadecimal characters.'}
            disabled={decode.isPending}
            maw={560}
            styles={{ input: { fontFamily: 'monospace' } }}
          />

          <Switch
            label="Verify the digest in the browser as well"
            description={
              isSubtleCryptoAvailable()
                ? 'Hashes the received file locally, which also proves the response arrived intact.'
                : 'Unavailable: Web Crypto needs a secure context (https or localhost).'
            }
            checked={verifyLocally && isSubtleCryptoAvailable()}
            onChange={(event) => setVerifyLocally(event.currentTarget.checked)}
            disabled={decode.isPending || !isSubtleCryptoAvailable()}
          />

          <RunControls
            label="Decode"
            onRun={run}
            onCancel={decode.cancel}
            running={decode.isPending}
            disabled={source === null || !shaValid}
            upload={decode.progress.upload}
            download={decode.progress.download}
          />
        </Stack>
      </SectionCard>

      {decode.error ? <ErrorPanel error={decode.error} onRetry={run} /> : null}
      
      {result ? (
        <SectionCard
          title="Restored archive"
          actions={
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={() => downloadBlob(result.blob, archiveNameFor(result.filename))}
            >
              Download {archiveNameFor(result.filename)}
            </Button>
          }
        >
          <Stack gap="sm">
            <Text size="sm">
              {formatBytes(result.blob.size)} recovered as{' '}
              <b>{archiveNameFor(result.filename)}</b>.
            </Text>

            {result.verified === true ? (
              <Alert color="teal" variant="light" icon={<IconCheck size={18} />} title="Digest verified">
                <Text size="sm">
                  The archive hashes to the expected SHA-256 both on the server and here in the
                  browser. The bytes are identical to the original.
                </Text>
              </Alert>
            ) : null}

            {result.verified === false ? (
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertTriangle size={18} />}
                title="Digest mismatch in the browser"
              >
                <Text size="sm">
                  The service accepted the payload but the file received here hashes to{' '}
                  <code>{result.actualSha256}</code> instead of <code>{result.expectedSha256}</code>
                  . The response was altered in transit - do not trust this download.
                </Text>
              </Alert>
            ) : null}
            
            {result.verified === null && result.actualSha256 ? (
              <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                SHA-256 of the received file: <code>{result.actualSha256}</code>
              </Text>
            ) : null}
          </Stack>
        </SectionCard>
      ) : null}
    </Stack>
  );
}