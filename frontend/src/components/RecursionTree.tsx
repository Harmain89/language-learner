import React from 'react';
import { motion } from 'framer-motion';
import { GitCommit, CheckCircle2, Loader2, ArrowUpRight } from 'lucide-react';
import type { CallTreeNode, TraceStep } from '../types';

interface RecursionTreeProps {
  step?: TraceStep;
  callTree: CallTreeNode[];
}

export const RecursionTree: React.FC<RecursionTreeProps> = ({ step, callTree }) => {
  if (callTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16 bg-slate-50/50">
        <GitCommit className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">No recursion frames recorded</p>
        <p className="text-xs text-slate-400 mt-1">
          Execute recursive algorithms (e.g. Fibonacci, Permutations, DFS) to expand the call-tree.
        </p>
      </div>
    );
  }

  // Build tree hierarchy map: parent_id -> children
  const childrenMap: Record<number, CallTreeNode[]> = {};
  const rootNodes: CallTreeNode[] = [];

  callTree.forEach((node) => {
    if (node.parent_id === null || !callTree.some(n => n.id === node.parent_id)) {
      rootNodes.push(node);
    } else {
      if (!childrenMap[node.parent_id]) {
        childrenMap[node.parent_id] = [];
      }
      childrenMap[node.parent_id].push(node);
    }
  });

  const renderNode = (node: CallTreeNode, depth: number = 0) => {
    const isCurrentlyActive = step?.active_node_id === node.id;
    const isReturned = node.status === 'returned';
    const children = childrenMap[node.id] || [];

    return (
      <div key={node.id} className="relative flex flex-col items-start ml-6 my-2">
        {/* Node card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex flex-col gap-1.5 px-4 py-2.5 rounded-xl border shadow-sm transition-all bg-white ${
            isCurrentlyActive
              ? 'border-purple-400 ring-2 ring-purple-100 shadow-purple-50 bg-purple-50/40'
              : isReturned
              ? 'border-slate-200 hover:border-slate-300'
              : 'border-slate-200 opacity-80'
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-900">
              {node.name}()
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              #id:{node.id}
            </span>

            {isCurrentlyActive ? (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md font-semibold animate-pulse border border-purple-200">
                <Loader2 className="w-3 h-3 animate-spin" />
                Active Call
              </span>
            ) : isReturned ? (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-semibold border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Returned
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                Waiting
              </span>
            )}
          </div>

          {/* Arguments */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-slate-700">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Args:</span>
            {Object.keys(node.args).length === 0 ? (
              <span className="text-slate-400 italic">None</span>
            ) : (
              Object.entries(node.args).map(([k, v]) => (
                <span
                  key={k}
                  className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-indigo-700 font-semibold"
                >
                  {k}={v}
                </span>
              ))
            )}
          </div>

          {/* Return Value */}
          {node.return_value !== null && (
            <div className="flex items-center gap-1.5 pt-1.5 mt-0.5 border-t border-slate-100 text-xs font-mono text-emerald-700 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Returned:</span>
              <span className="font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{node.return_value}</span>
            </div>
          )}
        </motion.div>

        {/* Children Subtrees */}
        {children.length > 0 && (
          <div className="relative pl-5 border-l-2 border-purple-200 ml-4 mt-1">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full min-h-[460px] p-6 overflow-auto bg-slate-50/40">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
        <span className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <GitCommit className="w-4 h-4 text-purple-600" />
          Call-Tree &amp; Backtracking State Expansion
        </span>
        <span className="text-xs font-mono text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
          Total Calls: <strong className="text-purple-600">{callTree.length}</strong>
        </span>
      </div>

      <div className="py-2">
        {rootNodes.map((root) => renderNode(root, 0))}
      </div>
    </div>
  );
};
