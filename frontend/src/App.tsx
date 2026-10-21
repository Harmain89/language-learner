import { useState, useEffect, useRef } from 'react';
import {
  Layers,
  GitCommit,
  Compass,
  Terminal,
  Play,
  RotateCcw,
  TerminalSquare,
  AlertCircle,
  FileCode2
} from 'lucide-react';

import type { TraceResult, TraceStep } from './types';
import { executeTrace } from './api';

import { Navbar } from './components/Navbar';
import { MonacoCodeEditor } from './components/MonacoCodeEditor';
import { PlaybackControls } from './components/PlaybackControls';
import { MemoryGraph } from './components/MemoryGraph';
import { RecursionTree } from './components/RecursionTree';
import { AlgorithmLab } from './components/AlgorithmLab';
import { BytecodeViewer } from './components/BytecodeViewer';
import { LeetCodeArena } from './components/LeetCodeArena';

const PRESET_EXAMPLES = [
  {
    name: 'Variables & String Interning',
    code: `# Real-Time Python Memory Trace
a = "harmain"
print(a)
b = "harmain"
print(a is b)
`,
    mode: 'memory' as const,
  },
  {
    name: 'List Mutation & Reference Aliasing',
    code: `# References share the same heap object
x = [1, 2, 3]
y = x
y.append(4)
print("x:", x)
print("y is x:", y is x)
`,
    mode: 'memory' as const,
  },
  {
    name: 'Mutable Default Argument Trap',
    code: `# Default arguments are created ONCE at def time!
def append_to(element, target=[]):
    target.append(element)
    return target

res1 = append_to(1)
res2 = append_to(2)
print("res2:", res2)  # [1, 2] !
`,
    mode: 'memory' as const,
  },
  {
    name: 'Late-Binding Closure Gotcha',
    code: `# Lambdas capture variable 'i' by reference, not by value!
funcs = [lambda: i for i in range(3)]
results = [f() for f in funcs]
print("results:", results)  # [2, 2, 2] !
`,
    mode: 'memory' as const,
  },
  {
    name: 'Recursion Call Tree (Factorial)',
    code: `def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

ans = fact(4)
print("fact(4) =", ans)
`,
    mode: 'recursion' as const,
  },
  {
    name: 'Two Pointers Array Scan',
    code: `# Two Pointers logic on sorted array
nums = [2, 7, 11, 15]
target = 9

left, right = 0, len(nums) - 1
found = None

while left < right:
    curr_sum = nums[left] + nums[right]
    if curr_sum == target:
        found = (left, right)
        break
    elif curr_sum < target:
        left += 1
    else:
        right -= 1

print("indices:", found)
`,
    mode: 'algorithm' as const,
  },
];

export function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'visualizer' | 'leetcode'>('visualizer');
  const [isRealTimeActive, setIsRealTimeActive] = useState<boolean>(true);

  // Editor & Cursor State
  const [code, setCode] = useState<string>(PRESET_EXAMPLES[0].code);
  const [cursorLine, setCursorLine] = useState<number>(1);
  const [isTracing, setIsTracing] = useState<boolean>(false);
  const [showTerminal, setShowTerminal] = useState<boolean>(false);
  const [liveSyntaxError, setLiveSyntaxError] = useState<string | null>(null);

  // Trace & Visualizer State
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeVisualizer, setActiveVisualizer] = useState<'memory' | 'recursion' | 'algorithm' | 'bytecode'>('memory');

  // Timers & Debounce
  const debounceTimerRef = useRef<any>(null);
  const playTimerRef = useRef<any>(null);
  const traceCounterRef = useRef<number>(0);
  const cursorLineRef = useRef<number>(1);

  // Keep cursorLineRef updated for async callbacks
  useEffect(() => {
    cursorLineRef.current = cursorLine;
  }, [cursorLine]);

  // Find the most appropriate step index for a given line number
  const findStepForLine = (steps: TraceStep[], targetLine: number): number => {
    if (!steps || steps.length === 0) return 0;

    // Prefer the last step that was executed at or before targetLine
    let bestIdx = -1;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].line <= targetLine) {
        bestIdx = i;
      }
    }

    if (bestIdx !== -1) {
      return bestIdx;
    }

    // Fallback: if cursor is above the first executed line, pick the first step
    return 0;
  };

  // Execute Trace Function
  const runTrace = async (codeToRun?: string, targetLineNum?: number) => {
    const targetCode = codeToRun !== undefined ? codeToRun : code;
    if (!targetCode.trim()) return;

    const traceId = ++traceCounterRef.current;
    setIsTracing(true);

    try {
      const res = await executeTrace(targetCode);
      if (traceId === traceCounterRef.current) {
        if (res.success && res.steps.length > 0) {
          setTraceResult(res);
          setLiveSyntaxError(null);

          // Synchronize step index with the line where the user is
          const lineToSync = targetLineNum !== undefined ? targetLineNum : cursorLineRef.current;
          const targetStepIdx = findStepForLine(res.steps, lineToSync);
          setCurrentStepIndex(targetStepIdx);
        } else if (!res.success) {
          // If code is temporarily incomplete while typing, keep previous valid trace if exists
          setLiveSyntaxError(res.error_message || 'Incomplete syntax');
          if (!traceResult || traceResult.steps.length === 0) {
            setTraceResult(res);
          }
        }
      }
    } catch (e) {
      console.error('Trace execution failed', e);
    } finally {
      if (traceId === traceCounterRef.current) {
        setIsTracing(false);
      }
    }
  };

  // Initial trace run on mount
  useEffect(() => {
    runTrace(code, 1);
  }, []);

  // Debounced real-time execution when code changes
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);

    if (isRealTimeActive) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        runTrace(newCode, cursorLineRef.current);
      }, 350);
    }
  };

  // Cursor position changed in Monaco Editor (line change synchronization)
  const handleCursorLineChange = (newLine: number) => {
    setCursorLine(newLine);
    cursorLineRef.current = newLine;

    // Immediately synchronize visualizer step to the line the user clicked/moved to
    if (traceResult && traceResult.steps && traceResult.steps.length > 0) {
      const targetStepIdx = findStepForLine(traceResult.steps, newLine);
      setCurrentStepIndex(targetStepIdx);
    }
  };

  // Playback timer loop
  useEffect(() => {
    if (isPlaying && traceResult && traceResult.steps.length > 0) {
      const intervalMs = Math.round(1000 / playbackSpeed);
      playTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= traceResult.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, traceResult]);

  const activeStep: TraceStep | undefined =
    traceResult && traceResult.steps.length > 0
      ? traceResult.steps[currentStepIndex]
      : undefined;

  const handleSelectPreset = (index: number) => {
    const preset = PRESET_EXAMPLES[index];
    if (!preset) return;
    setCode(preset.code);
    setActiveVisualizer(preset.mode);
    setLiveSyntaxError(null);
    runTrace(preset.code, 1);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isRealTimeActive={isRealTimeActive}
        onToggleRealTime={() => setIsRealTimeActive((prev) => !prev)}
        isTracing={isTracing}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'leetcode' ? (
          <LeetCodeArena />
        ) : (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left Column: Monaco Code Editor & Console (5 cols) */}
            <div className="lg:col-span-5 flex flex-col h-full border-r border-slate-200 bg-white overflow-hidden shadow-xs">
              {/* Presets and Run Toolbar */}
              <div className="h-12 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-indigo-600" />
                  <select
                    onChange={(e) => handleSelectPreset(Number(e.target.value))}
                    className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    defaultValue={0}
                  >
                    {PRESET_EXAMPLES.map((p, idx) => (
                      <option key={p.name} value={idx}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const simpleCode = 'a = "harmain"\nprint(a)';
                      setCode(simpleCode);
                      setLiveSyntaxError(null);
                      runTrace(simpleCode, 1);
                    }}
                    title="Reset to simple code"
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => runTrace(code, cursorLine)}
                    disabled={isTracing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Run Trace</span>
                  </button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 overflow-hidden p-3 flex flex-col gap-2">
                <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 shadow-xs bg-white">
                  <MonacoCodeEditor
                    code={code}
                    activeLine={activeStep?.line}
                    isLoading={isTracing}
                    isVerifying={false}
                    hasChallenge={false}
                    isRealTimeActive={isRealTimeActive}
                    syntaxNotice={traceResult?.syntax_notice || (liveSyntaxError ? 'Incomplete syntax (typing...)' : null)}
                    onChange={handleCodeChange}
                    onRunTrace={() => runTrace(code, cursorLine)}
                    onCursorLineChange={handleCursorLineChange}
                    onReset={() => {
                      const simpleCode = 'a = "harmain"\nprint(a)';
                      setCode(simpleCode);
                      setLiveSyntaxError(null);
                      runTrace(simpleCode, 1);
                    }}
                  />
                </div>

                {/* Notice Banner if complete execution failed with no steps */}
                {traceResult && !traceResult.success && traceResult.steps.length === 0 && traceResult.error_message && (
                  <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs font-mono space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{traceResult.error_type || 'Execution Notice'}</span>
                    </div>
                    <p className="line-clamp-2">{traceResult.error_message}</p>
                  </div>
                )}

                {/* Standard Output Console */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <div
                    onClick={() => setShowTerminal(!showTerminal)}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50 text-slate-700 text-xs font-mono cursor-pointer hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-2">
                      <TerminalSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="font-semibold">Terminal Output ({activeStep?.stdout ? 'Active' : 'Empty'})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {showTerminal ? '▲ Click to minimize' : '▼ Click to expand'}
                    </span>
                  </div>

                  {showTerminal && (
                    <div className="p-3 font-mono text-xs text-slate-900 bg-slate-900 text-emerald-400 max-h-28 overflow-y-auto whitespace-pre-wrap selection:bg-emerald-800">
                      {activeStep?.stdout || '(No standard output printed)'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Visualizer Canvas & Scrubber (7 cols) */}
            <div className="lg:col-span-7 flex flex-col h-full bg-slate-50/60 overflow-hidden">
              {/* Visualizer Mode Switcher Tabs */}
              <div className="h-12 border-b border-slate-200 px-4 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveVisualizer('memory')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeVisualizer === 'memory'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Memory Graph</span>
                  </button>

                  <button
                    onClick={() => setActiveVisualizer('recursion')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeVisualizer === 'recursion'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <GitCommit className="w-3.5 h-3.5 text-purple-600" />
                    <span>Recursion Tree</span>
                  </button>

                  <button
                    onClick={() => setActiveVisualizer('algorithm')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeVisualizer === 'algorithm'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5 text-amber-600" />
                    <span>Algorithm Arena</span>
                  </button>

                  <button
                    onClick={() => setActiveVisualizer('bytecode')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeVisualizer === 'bytecode'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Bytecode VM</span>
                  </button>
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                  Step {traceResult?.steps?.length ? currentStepIndex + 1 : 0} of {traceResult?.steps?.length || 0}
                  {activeStep?.line ? ` (Line ${activeStep.line})` : ''}
                </div>
              </div>

              {/* Visualizer Canvas Viewport */}
              <div className="flex-1 overflow-auto p-4">
                {activeVisualizer === 'memory' && (
                  <MemoryGraph step={activeStep} />
                )}

                {activeVisualizer === 'recursion' && (
                  <RecursionTree
                    step={activeStep}
                    callTree={traceResult?.call_tree || []}
                  />
                )}

                {activeVisualizer === 'algorithm' && (
                  <AlgorithmLab step={activeStep} />
                )}

                {activeVisualizer === 'bytecode' && (
                  <BytecodeViewer step={activeStep} />
                )}
              </div>

              {/* Bottom Playback Scrubber & Transport Toolbar */}
              <div className="border-t border-slate-200 bg-white shrink-0">
                <PlaybackControls
                  currentStepIndex={currentStepIndex}
                  totalSteps={traceResult?.steps?.length || 0}
                  currentStep={activeStep}
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  onStepChange={setCurrentStepIndex}
                  onTogglePlay={() => setIsPlaying((prev) => !prev)}
                  onSpeedChange={setPlaybackSpeed}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
