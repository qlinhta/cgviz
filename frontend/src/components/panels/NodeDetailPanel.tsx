// ---------------------------------------------------------------------------
// NodeDetailPanel — full detail view for the selected node
// ---------------------------------------------------------------------------

import { useGraphStore } from '../../stores/graphStore';
import { useNode, useNodeCallers, useNodeCallees } from '../../api/hooks';
import { getNodeColor, getNodeLabel, getEdgeLabel } from '../../lib/colors';
import { cn, truncate } from '../../lib/utils';
import type { EdgeData } from '../../api/types';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium"
      style={{
        backgroundColor: color + '18',
        color,
      }}
    >
      {label}
    </span>
  );
}

function MetadataBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-bg-tertiary px-2 py-0.5 text-2xs font-medium text-text-secondary">
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 border-b last:border-b-0">
      <h4 className="text-2xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
        {title}
      </h4>
      {children}
    </div>
  );
}

function EdgeItem({
  edge,
  linkedNodeId,
  linkedNodeName,
}: {
  edge: EdgeData;
  linkedNodeId: string;
  linkedNodeName?: string;
}) {
  const { selectNode } = useGraphStore();
  const displayName = linkedNodeName ?? linkedNodeId;
  return (
    <button
      onClick={() => selectNode(linkedNodeId)}
      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-bg-tertiary transition-colors group"
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-text-muted"
      />
      <span className="flex-1 text-xs text-text-primary truncate group-hover:text-accent font-mono">
        {truncate(displayName, 40)}
      </span>
      <span className="text-2xs text-text-muted shrink-0">{getEdgeLabel(edge.kind)}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-16 rounded-full bg-bg-tertiary" />
          <div className="h-5 w-32 rounded bg-bg-tertiary" />
        </div>
      </div>
      <div className="p-3 border-b space-y-2">
        <div className="h-3 w-12 rounded bg-bg-tertiary" />
        <div className="h-4 w-full rounded bg-bg-tertiary" />
        <div className="h-4 w-3/4 rounded bg-bg-tertiary" />
        <div className="h-4 w-1/2 rounded bg-bg-tertiary" />
      </div>
      <div className="p-3 border-b space-y-2">
        <div className="h-3 w-16 rounded bg-bg-tertiary" />
        <div className="h-12 w-full rounded bg-bg-tertiary" />
      </div>
      <div className="p-3 space-y-2">
        <div className="h-3 w-12 rounded bg-bg-tertiary" />
        <div className="h-4 w-full rounded bg-bg-tertiary" />
        <div className="h-4 w-full rounded bg-bg-tertiary" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NodeDetailPanel() {
  const { selectedNodeId } = useGraphStore();
  const { data: node, isLoading: nodeLoading } = useNode(selectedNodeId);
  const { data: callers, isLoading: callersLoading } = useNodeCallers(selectedNodeId);
  const { data: callees, isLoading: calleesLoading } = useNodeCallees(selectedNodeId);

  // Empty state
  if (!selectedNodeId) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <svg className="h-8 w-8 text-text-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <p className="text-xs text-text-muted">Click a node to see details</p>
      </div>
    );
  }

  // Loading state
  if (nodeLoading) {
    return <DetailSkeleton />;
  }

  // No data
  if (!node) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <p className="text-xs text-text-muted">Node not found</p>
      </div>
    );
  }

  const nodeColor = getNodeColor(node.kind);

  // Collect metadata badges
  const metaBadges: string[] = [];
  if (node.is_exported) metaBadges.push('exported');
  if (node.is_async) metaBadges.push('async');
  if (node.is_static) metaBadges.push('static');
  if (node.is_abstract) metaBadges.push('abstract');

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge label={getNodeLabel(node.kind)} color={nodeColor} />
          <h3 className="text-sm font-semibold text-text-primary break-all">
            {node.name}
          </h3>
        </div>
      </div>

      {/* Info section */}
      <Section title="Info">
        <div className="space-y-1.5">
          <div>
            <span className="text-2xs text-text-muted">Qualified name</span>
            <p className="text-xs text-text-secondary font-mono break-all">
              {node.qualified_name}
            </p>
          </div>
          <div>
            <span className="text-2xs text-text-muted">Location</span>
            <p className="text-xs text-text-secondary font-mono">
              {node.file_path}:{node.start_line}-{node.end_line}
            </p>
          </div>
          <div>
            <span className="text-2xs text-text-muted">Language</span>
            <p className="text-xs text-text-secondary">{node.language}</p>
          </div>
        </div>
      </Section>

      {/* Signature */}
      {node.signature && (
        <Section title="Signature">
          <pre className="rounded-md bg-bg-tertiary p-2 text-2xs font-mono text-text-primary overflow-x-auto whitespace-pre-wrap break-all">
            {node.signature}
          </pre>
        </Section>
      )}

      {/* Docstring */}
      {node.docstring && (
        <Section title="Docstring">
          <div className="rounded-md bg-bg-tertiary p-2 text-2xs text-text-secondary whitespace-pre-wrap">
            {node.docstring}
          </div>
        </Section>
      )}

      {/* Metadata badges */}
      {metaBadges.length > 0 && (
        <Section title="Metadata">
          <div className="flex flex-wrap gap-1.5">
            {metaBadges.map((label) => (
              <MetadataBadge key={label} label={label} />
            ))}
          </div>
        </Section>
      )}

      {/* Decorators */}
      {node.decorators && node.decorators.length > 0 && (
        <Section title="Decorators">
          <div className="flex flex-wrap gap-1.5">
            {node.decorators.map((dec, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-accent-muted px-2 py-0.5 text-2xs font-mono text-accent"
              >
                @{dec}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Callers */}
      <Section title={cn('Callers', callers && `(${callers.length})`)}>
        {callersLoading ? (
          <div className="space-y-1 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                <div className="h-2 w-2 rounded-full bg-bg-tertiary" />
                <div className="h-3.5 flex-1 rounded bg-bg-tertiary" />
              </div>
            ))}
          </div>
        ) : callers && callers.length > 0 ? (
          <div className="space-y-0.5">
            {callers.map((edge) => (
              <EdgeItem
                key={edge.id}
                edge={edge}
                linkedNodeId={edge.source}
                linkedNodeName={edge.source_name}
              />
            ))}
          </div>
        ) : (
          <p className="text-2xs text-text-muted px-2 py-1">No callers</p>
        )}
      </Section>

      {/* Callees */}
      <Section title={cn('Callees', callees && `(${callees.length})`)}>
        {calleesLoading ? (
          <div className="space-y-1 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                <div className="h-2 w-2 rounded-full bg-bg-tertiary" />
                <div className="h-3.5 flex-1 rounded bg-bg-tertiary" />
              </div>
            ))}
          </div>
        ) : callees && callees.length > 0 ? (
          <div className="space-y-0.5">
            {callees.map((edge) => (
              <EdgeItem
                key={edge.id}
                edge={edge}
                linkedNodeId={edge.target}
                linkedNodeName={edge.target_name}
              />
            ))}
          </div>
        ) : (
          <p className="text-2xs text-text-muted px-2 py-1">No callees</p>
        )}
      </Section>
    </div>
  );
}
