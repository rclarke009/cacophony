"use client";

import type { InviteTreeNode } from "@/app/actions/members";

interface InviteTreeViewProps {
  tree: InviteTreeNode[];
}

function TreeNode({ node, depth = 0 }: { node: InviteTreeNode; depth?: number }) {
  const hasBotFlag = node.bot_invitee_count >= 3;
  return (
    <div
      className="border-l border-border pl-3"
      style={{ marginLeft: depth * 16 }}
    >
      <div className="flex items-center gap-2 py-1">
        <span className="font-medium text-foreground">
          {node.username ?? "Unknown"}
        </span>
        <span className="text-xs text-muted-foreground">({node.role})</span>
        {hasBotFlag && (
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-400">
            {node.bot_invitee_count}+ bot invitees
          </span>
        )}
      </div>
      {node.children.length > 0 && (
        <div className="mt-1 space-y-0">
          {node.children.map((child) => (
            <TreeNode key={child.user_id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function InviteTreeView({ tree }: InviteTreeViewProps) {
  if (tree.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No invite tree data yet. Members who joined via a link or direct invite will appear here.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {tree.map((node) => (
        <TreeNode key={node.user_id} node={node} />
      ))}
    </div>
  );
}
