'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatNumber } from '@/lib/utils';

interface TreeNode {
  id: string;
  name: string;
  avatar?: string;
  count: number;
  volume: number;
  children?: TreeNode[];
}

interface BinaryTreeProps {
  leftNode: TreeNode;
  rightNode: TreeNode;
}

function TreeNodeCard({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = React.useState(depth === 0);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border',
          depth === 0
            ? 'bg-primary/10 border-primary/30'
            : 'bg-card border-card-border hover:border-primary/30 transition-colors cursor-pointer'
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <Avatar size="sm">
          {node.avatar ? (
            <AvatarImage src={node.avatar} alt={node.name} />
          ) : (
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {node.name.charAt(0)}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium truncate',
            depth === 0 ? 'text-primary' : 'text-text-primary'
          )}>
            {node.name}
          </p>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>{formatNumber(node.count)} members</span>
          </div>
        </div>

        {hasChildren && (
          <Button variant="ghost" size="icon-sm" className="h-6 w-6">
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
      </motion.div>

      {/* Children */}
      {hasChildren && expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-2 pl-4 border-l-2 border-primary/20 ml-4"
        >
          <div className="grid grid-cols-2 gap-2 py-2">
            {node.children?.map((child) => (
              <TreeNodeCard key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function BinaryTree({ leftNode, rightNode }: BinaryTreeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Card className="p-0">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Binary Tree
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 pt-0">
          <div className="space-y-4">
            {/* Root Node (You) */}
            <div className="flex justify-center">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30">
                <Avatar size="md">
                  <AvatarFallback className="bg-primary text-white">
                    AJ
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-text-primary">You (Root)</p>
                  <Badge variant="gold" size="sm">Silver</Badge>
                </div>
              </div>
            </div>

            {/* Connection Lines */}
            <div className="flex justify-center">
              <div className="flex gap-32">
                <div className="h-6 w-px bg-primary/30" />
                <div className="h-6 w-px bg-primary/30" />
              </div>
            </div>

            {/* Left and Right Nodes */}
            <div className="grid grid-cols-2 gap-4">
              <TreeNodeCard node={leftNode} />
              <TreeNodeCard node={rightNode} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
