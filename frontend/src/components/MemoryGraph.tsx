import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Cpu,
  Link as LinkIcon,
  ShieldCheck,
  ShieldAlert,
  Database
} from 'lucide-react';
import type { TraceStep } from '../types';

interface MemoryGraphProps {
  step?: TraceStep;
}

interface PointerLine {
  id: string;
  varName: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}

const POINTER_COLORS = [
  '#4f46e5', // indigo-600
  '#0284c7', // sky-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#7c3aed', // violet-600
  '#dc2626', // red-600
];

export const MemoryGraph: React.FC<MemoryGraphProps> = ({ step }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pointers, setPointers] = useState<PointerLine[]>([]);

  // Calculate pointer arrow positions dynamically from DOM elements
  const updatePointers = () => {
    if (!containerRef.current || !step) {
      setPointers([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPointers: PointerLine[] = [];
    let colorIdx = 0;

    step.stack_frames.forEach((frame) => {
      Object.entries(frame.locals).forEach(([varName, varInfo]) => {
        const varElement = containerRef.current?.querySelector(
          `[data-var-anchor="${frame.id}_${varName}"]`
        );
        const heapElement = containerRef.current?.querySelector(
          `[data-heap-anchor="${varInfo.object_id}"]`
        );

        if (varElement && heapElement) {
          const varRect = varElement.getBoundingClientRect();
          const heapRect = heapElement.getBoundingClientRect();

          const startX = varRect.right - containerRect.left;
          const startY = varRect.top + varRect.height / 2 - containerRect.top;
          const endX = heapRect.left - containerRect.left;
          const endY = heapRect.top + heapRect.height / 2 - containerRect.top;

          newPointers.push({
            id: `${frame.id}_${varName}_to_${varInfo.object_id}`,
            varName,
            startX,
            startY,
            endX,
            endY,
            color: POINTER_COLORS[colorIdx % POINTER_COLORS.length]
          });
          colorIdx++;
        }
      });
    });

    setPointers(newPointers);
  };

  useLayoutEffect(() => {
    updatePointers();
    const handleResize = () => updatePointers();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [step]);

  useEffect(() => {
    const timer = setTimeout(updatePointers, 50);
    return () => clearTimeout(timer);
  }, [step]);

  if (!step || step.stack_frames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16 bg-slate-50/50">
        <Database className="w-12 h-12 mb-3 text-slate-300 animate-pulse" />
        <p className="text-sm font-semibold text-slate-600">No active variables in memory</p>
        <p className="text-xs text-slate-400 mt-1">Write Python code in the editor to visualize Stack &amp; Heap allocations.</p>
      </div>
    );
  }

  // Count references to highlight aliasing
  const referenceCounts: Record<string, number> = {};
  step.stack_frames.forEach(frame => {
    Object.values(frame.locals).forEach(v => {
      referenceCounts[v.object_id] = (referenceCounts[v.object_id] || 0) + 1;
    });
  });

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[460px] p-6 overflow-auto bg-slate-50/40">
      {/* SVG Layer for animated pointer arrows */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ minWidth: '100%', minHeight: '100%' }}
      >
        <defs>
          {POINTER_COLORS.map((color, i) => (
            <marker
              key={i}
              id={`arrowhead-light-${i}`}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill={color} />
            </marker>
          ))}
        </defs>

        {pointers.map((ptr, idx) => {
          const deltaX = Math.max(40, (ptr.endX - ptr.startX) * 0.45);
          const pathD = `M ${ptr.startX} ${ptr.startY} C ${ptr.startX + deltaX} ${ptr.startY}, ${ptr.endX - deltaX} ${ptr.endY}, ${ptr.endX} ${ptr.endY}`;

          return (
            <g key={ptr.id} className="pointer-arrow">
              {/* Outer soft glow */}
              <path
                d={pathD}
                fill="none"
                stroke={ptr.color}
                strokeWidth="5"
                strokeOpacity="0.2"
              />
              {/* Main arrow path */}
              <path
                d={pathD}
                fill="none"
                stroke={ptr.color}
                strokeWidth="2.5"
                markerEnd={`url(#arrowhead-light-${idx % POINTER_COLORS.length})`}
              />
            </g>
          );
        })}
      </svg>

      {/* Main Grid: Stack Frames (Left) vs Heap Objects (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-0">
        {/* Left Column: Call Stack Frames (Cols 1-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-indigo-600" />
              Call Stack Frames
            </span>
            <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              Depth: {step.call_depth}
            </span>
          </div>

          <div className="space-y-3">
            {step.stack_frames.map((frame, frameIdx) => {
              const isTop = frameIdx === step.stack_frames.length - 1;
              const hasLocals = Object.keys(frame.locals).length > 0;

              return (
                <motion.div
                  key={frame.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border bg-white p-4 shadow-sm transition-all ${
                    isTop
                      ? 'border-indigo-300 ring-2 ring-indigo-50 shadow-indigo-100/50'
                      : 'border-slate-200 opacity-90'
                  }`}
                >
                  {/* Frame Header */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-indigo-950">
                        {frame.name}()
                      </span>
                      {isTop && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                          Active Frame
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Line {frame.line}
                    </span>
                  </div>

                  {/* Variables List */}
                  <div className="space-y-2">
                    {!hasLocals ? (
                      <p className="text-xs text-slate-400 italic py-1">No local variables</p>
                    ) : (
                      Object.entries(frame.locals).map(([name, info]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-white text-slate-600 border border-slate-200 shadow-2xs">
                              {info.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-700 font-semibold truncate max-w-[140px] bg-white px-2 py-0.5 rounded border border-slate-200/60 shadow-2xs">
                              {info.repr}
                            </span>
                            {/* Anchor point for SVG arrow */}
                            <div
                              data-var-anchor={`${frame.id}_${name}`}
                              className="w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-indigo-50 shadow-sm shrink-0"
                              title={`Reference to 0x${info.object_id}`}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Heap Allocated Objects (Cols 6-12) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-emerald-600" />
              Heap Objects (PyObject Memory)
            </span>
            <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              Objects: {Object.keys(step.heap_objects).length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <AnimatePresence>
              {Object.values(step.heap_objects).map((obj) => {
                const aliasCount = referenceCounts[obj.id] || 0;
                const isAliased = aliasCount > 1;

                return (
                  <motion.div
                    key={obj.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`relative rounded-xl border bg-white p-4 shadow-sm transition-all ${
                      isAliased
                        ? 'border-amber-300 ring-2 ring-amber-50 shadow-amber-50'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    {/* Anchor point on left edge for pointer arrow */}
                    <div
                      data-heap-anchor={obj.id}
                      className="absolute -left-1.5 top-6 w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50 border-2 border-white shadow-sm"
                      title={`Memory Address: 0x${obj.id}`}
                    />

                    {/* Heap Object Header - Clean & Roomy */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {obj.type}
                        </span>
                        {obj.is_mutable ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <ShieldAlert className="w-3 h-3 text-emerald-600" />
                            Mutable
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <ShieldCheck className="w-3 h-3 text-slate-500" />
                            Immutable
                          </span>
                        )}
                      </div>

                      {/* Reference count */}
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                        <LinkIcon className="w-3 h-3 text-slate-400" />
                        <span>ref: <strong className="text-slate-700">{obj.ref_count}</strong></span>
                      </div>
                    </div>

                    {/* Metadata Badges Row (No overlapping!) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 mb-3 border-t border-slate-100 text-[10px] font-mono">
                      <span className="text-slate-400">id: ...{obj.id.slice(-6)}</span>

                      {obj.is_small_int && (
                        <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                          [-5..256] Cached Int
                        </span>
                      )}

                      {obj.is_interned && (
                        <span className="text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded font-semibold border border-purple-200">
                          Interned Str
                        </span>
                      )}

                      {obj.is_immortal && (
                        <span className="text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded font-semibold border border-sky-200">
                          Immortal Obj
                        </span>
                      )}

                      {isAliased && (
                        <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-bold border border-amber-300">
                          Aliased ({aliasCount} names)
                        </span>
                      )}
                    </div>

                    {/* Content inspection by type */}
                    {obj.elements && obj.elements.length > 0 ? (
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Elements ({obj.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                          {obj.elements.map((el) => (
                            <div
                              key={el.index}
                              className="px-2 py-1 rounded bg-white border border-slate-200 text-xs font-mono font-medium text-slate-800 shadow-2xs"
                              title={`Index [${el.index}] -> id: ${el.object_id}`}
                            >
                              <span className="text-slate-400 text-[10px]">[{el.index}] </span>
                              {el.repr}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : obj.entries && obj.entries.length > 0 ? (
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Key-Value Entries ({obj.length}):
                        </span>
                        <div className="space-y-1 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono">
                          {obj.entries.map((entry, eIdx) => (
                            <div key={eIdx} className="flex items-center justify-between p-1 rounded bg-white border border-slate-100">
                              <span className="text-indigo-700 font-semibold">{entry.key_repr}:</span>
                              <span className="text-emerald-700 font-medium">{entry.val_repr}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : obj.attributes && Object.keys(obj.attributes).length > 0 ? (
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Instance Attributes ({obj.class_name}):
                        </span>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono space-y-1">
                          {Object.entries(obj.attributes).map(([attr, val]) => (
                            <div key={attr} className="flex justify-between p-1 bg-white rounded border border-slate-100">
                              <span className="text-indigo-600 font-semibold">.{attr}</span>
                              <span className="text-slate-700">{val.repr}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs font-semibold text-slate-800">
                        {obj.repr}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
