import { useState } from 'react';
import { ActionIcon, Badge, Box, Group, ScrollArea, Text, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconFile,
  IconFileZip,
  IconFolder,
} from '@tabler/icons-react';
import { isDirectory, type ArchiveNode, type FileNode } from '@shared/domain/archive';
import { formatBytes } from '@shared/lib/bytes';

export interface ArchiveTreeViewProps {
  root: ArchiveNode;
  onDownloadFile?: (node: FileNode) => void;
  // directories at or below this depth start expanded
  defaultExpandedDepth?: number;
  maxHeight?: number;
}

interface NodeRowProps {
  node: ArchiveNode;
  depth: number;
  defaultExpandedDepth: number;
  onDownloadFile?: (node: FileNode) => void;
}

function NodeRow({ node, depth, defaultExpandedDepth, onDownloadFile }: NodeRowProps) {
  const [expanded, setExpanded] = useState(depth < defaultExpandedDepth);
  const directory = isDirectory(node);
  const indent = depth * 18;

  return (
    <Box>
      <Group
        gap="xs"
        wrap="nowrap"
        py={4}
        pl={indent}
        style={{ borderRadius: 4, minWidth: 0 }}
        className="archive-tree-row"
      >
        {directory ? (
          <UnstyledButton
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            {expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          </UnstyledButton>
        ) : (
          <Box w={16} />
        )}

        {directory ? (
          node.nestedArchive ? (
            <IconFileZip size={16} stroke={1.5} />
          ) : (
            <IconFolder size={16} stroke={1.5} />
          )
        ) : (
          <IconFile size={16} stroke={1.5} />
        )}

        <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }} title={node.path}>
          {node.name === '' ? '/' : node.name}
        </Text>

        {directory ? (
          <>
            {node.nestedArchive ? (
              <Badge size="xs" variant="light" color="grape">
                nested archive
              </Badge>
            ) : null}
            <Text size="xs" c="dimmed">
              {node.children.length} item{node.children.length === 1 ? '' : 's'}
            </Text>
          </>
        ) : (
          <>
            {node.content === null || node.content === undefined ? (
              <Tooltip label="No Base64 content was returned for this entry, so it cannot be rebuilt or downloaded.">
                <Badge size="xs" variant="light" color="yellow">
                  metadata only
                </Badge>
              </Tooltip>
            ) : null}

            <Text size="xs" c="dimmed">
              {formatBytes(node.sizeBytes)}
            </Text>

            {onDownloadFile && node.content ? (
              <Tooltip label="Download this entry">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  onClick={() => onDownloadFile(node)}
                  aria-label={`Download ${node.name}`}
                >
                  <IconDownload size={14} />
                </ActionIcon>
              </Tooltip>
            ) : null}
          </>
        )}
      </Group>

      {directory && expanded
        ? node.children.map((child) => (
            <NodeRow
              key={child.path || `${node.path}/${child.name}`}
              node={child}
              depth={depth + 1}
              defaultExpandedDepth={defaultExpandedDepth}
              {...(onDownloadFile ? { onDownloadFile } : {})}
            />
          ))
        : null}
    </Box>
  );
}

/**
 * a recursive tree built from Mantine primitives rather than a generic tree
 * component, because each row needs archive-specific "metadata only"
 * marker that explains why an entry cannot be rebuilt, the nested-archive marker,
 * and a per-entry download
 */
export function ArchiveTreeView({
  root,
  onDownloadFile,
  defaultExpandedDepth = 2,
  maxHeight = 460,
}: ArchiveTreeViewProps) {
  return (
    <ScrollArea.Autosize mah={maxHeight} type="auto">
      <Box role="tree" aria-label="Archive contents" pr="sm">
        <NodeRow
          node={root}
          depth={0}
          defaultExpandedDepth={defaultExpandedDepth}
          {...(onDownloadFile ? { onDownloadFile } : {})}
        />
      </Box>
    </ScrollArea.Autosize>
  );
}