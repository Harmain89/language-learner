import React from 'react';
import { motion } from 'framer-motion';
import { Compass, ArrowDown, Eye } from 'lucide-react';
import type { TraceStep } from '../types';

interface AlgorithmLabProps {
  step?: TraceStep;
}

export const AlgorithmLab: React.FC<AlgorithmLabProps> = ({ step }) => {
  if (!step) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16 bg-slate-50/50">
        <Compass className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">Algorithm state inactive</p>
        <p className="text-xs text-slate-400 mt-1">Run an algorithm to track pointers and array windows.</p>
      </div>
    );
  }

  // Find active array from pointers or local variables
  let arrayData: { name: string; items: string[] } | null = null;
  const pointers: Record<string, number> = {};

  if (step.algorithm_pointers._active_array) {
    arrayData = {
      name: step.algorithm_pointers._active_array.name,
      items: step.algorithm_pointers._active_array.items
    };
  }

  // Find pointers and fallback array from stack frames
  const topFrame = step.stack_frames[step.stack_frames.length - 1];
  if (topFrame) {
    Object.entries(topFrame.locals).forEach(([name, info]) => {
      const lower = name.toLowerCase();
      if (typeof info.repr === 'string' && !isNaN(Number(info.repr))) {
        const val = parseInt(info.repr, 10);
        if (['left', 'right', 'mid', 'i', 'j', 'k', 'low', 'high', 'start', 'end', 'slow', 'fast', 'pivot'].includes(lower)) {
          pointers[name] = val;
        }
      }
      if (!arrayData && (info.type === 'list' || info.type === 'tuple')) {
        const heapObj = step.heap_objects[info.object_id];
        if (heapObj && heapObj.elements) {
          arrayData = {
            name,
            items: heapObj.elements.map(e => e.repr)
          };
        }
      }
    });
  }

  // Add explicit algorithm pointers from step
  Object.entries(step.algorithm_pointers).forEach(([k, v]) => {
    if (k !== '_active_array' && typeof v === 'number') {
      pointers[k] = v;
    }
  });

  const leftPtr = pointers['left'] ?? pointers['start'] ?? pointers['low'];
  const rightPtr = pointers['right'] ?? pointers['end'] ?? pointers['high'];

  return (
    <div className="w-full h-full min-h-[460px] p-6 overflow-auto bg-slate-50/40 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <span className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Compass className="w-4 h-4 text-amber-600" />
          Two Pointers &amp; Sliding Window Interactive Arena
        </span>
        <span className="text-xs font-mono text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
          Pointers: <strong className="text-amber-600">{Object.keys(pointers).length}</strong>
        </span>
      </div>

      {/* Visual Array Strip */}
      {arrayData && arrayData.items.length > 0 ? (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-indigo-700">
              Array: {arrayData.name} ({arrayData.items.length} elements)
            </span>
            {leftPtr !== undefined && rightPtr !== undefined && (
              <span className="text-[11px] font-mono text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-semibold">
                Active Window: [{leftPtr} ... {rightPtr}] (Length: {Math.max(0, rightPtr - leftPtr + 1)})
              </span>
            )}
          </div>

          {/* Array Cells */}
          <div className="flex items-center justify-start gap-3 overflow-x-auto py-8 px-2">
            {arrayData.items.map((val, idx) => {
              const inWindow = leftPtr !== undefined && rightPtr !== undefined && idx >= leftPtr && idx <= rightPtr;
              const matchingPointers = Object.entries(pointers).filter(([_, pVal]) => pVal === idx);

              return (
                <div key={idx} className="relative flex flex-col items-center">
                  {/* Top Pointer Badges */}
                  <div className="absolute -top-7 flex flex-wrap justify-center gap-1 min-h-[24px]">
                    {matchingPointers.map(([pName]) => (
                      <motion.div
                        key={pName}
                        initial={{ y: -5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="flex flex-col items-center"
                      >
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500 text-white shadow-sm">
                          {pName}
                        </span>
                        <ArrowDown className="w-3.5 h-3.5 text-amber-500 -mt-0.5" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Cell Box */}
                  <div
                    className={`w-13 h-13 flex items-center justify-center rounded-xl border-2 font-mono text-sm font-bold shadow-2xs transition-all ${
                      inWindow
                        ? 'border-amber-400 bg-amber-50 text-amber-900 ring-4 ring-amber-100 scale-105'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {val}
                  </div>

                  {/* Bottom Index Badge */}
                  <span className="text-[11px] font-mono font-medium text-slate-400 mt-1.5">
                    [{idx}]
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-xl border border-dashed border-slate-200 bg-white text-center text-slate-500 text-xs">
          No sequential list detected in local scope. Define an array like `nums = [...]` or `arr = [...]` to visualize pointer movements.
        </div>
      )}

      {/* Pointer Watch Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Eye className="w-4 h-4 text-indigo-600" />
          Active Variable Watch Table
        </div>

        {topFrame ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Object.entries(topFrame.locals).map(([name, info]) => (
              <div
                key={name}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-0.5"
              >
                <span className="text-[10px] text-slate-400 font-mono font-medium">{name}</span>
                <span className="text-xs font-mono font-bold text-slate-800 truncate">
                  {info.repr}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No active frame locals</p>
        )}
      </div>
    </div>
  );
};
