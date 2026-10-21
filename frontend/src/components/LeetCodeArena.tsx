import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Clock,
  HardDrive,
  Layers,
  ChevronDown
} from 'lucide-react';
import { MonacoCodeEditor } from './MonacoCodeEditor';
import { MemoryGraph } from './MemoryGraph';
import { PlaybackControls } from './PlaybackControls';
import { GotchaQuizLab } from './GotchaQuizLab';
import type { LeetCodeProblemSummary, LeetCodeProblemDetail, TraceResult, TraceStep } from '../types';
import { fetchLeetCodeProblems, fetchLeetCodeProblem, verifyLeetCodeSolution, executeTrace } from '../api';

export const LeetCodeArena: React.FC = () => {
  const [subTab, setSubTab] = useState<'problems' | 'quiz'>('problems');
  const [problems, setProblems] = useState<LeetCodeProblemSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('two-sum');
  const [activeProblem, setActiveProblem] = useState<LeetCodeProblemDetail | null>(null);
  const [code, setCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<{ passed: boolean; message: string; details?: string } | null>(null);
  const [showHints, setShowHints] = useState<boolean>(false);

  // Visualization state within problem arena
  const [showVisualizer, setShowVisualizer] = useState<boolean>(false);
  const [isTracing, setIsTracing] = useState<boolean>(false);
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  useEffect(() => {
    fetchLeetCodeProblems()
      .then((data) => {
        setProblems(data);
        if (data.length > 0 && !selectedSlug) {
          setSelectedSlug(data[0].slug);
        }
      })
      .catch((err) => console.error('Failed to load LeetCode problems', err));
  }, []);

  useEffect(() => {
    if (!selectedSlug) return;
    fetchLeetCodeProblem(selectedSlug)
      .then((p) => {
        setActiveProblem(p);
        setCode(p.starter_code);
        setVerifyResult(null);
        setShowVisualizer(false);
        setTraceResult(null);
      })
      .catch((err) => console.error(err));
  }, [selectedSlug]);

  const handleRunAndVisualize = async () => {
    if (!code.trim()) return;
    setIsTracing(true);
    setShowVisualizer(true);
    try {
      const res = await executeTrace(code);
      setTraceResult(res);
      setCurrentStepIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTracing(false);
    }
  };

  const handleVerifySolution = async () => {
    if (!selectedSlug) return;
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const res = await verifyLeetCodeSolution(selectedSlug, code);
      setVerifyResult(res);
      if (res.passed) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    } catch (e: any) {
      setVerifyResult({
        passed: false,
        message: e?.message || 'Verification request failed'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const activeStep: TraceStep | undefined =
    traceResult && traceResult.steps.length > 0
      ? traceResult.steps[currentStepIndex]
      : undefined;

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Hard':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/60 overflow-hidden">
      {/* Top Arena Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              LeetCode Algorithmic Arena &amp; Logic Lab
            </h2>
            <p className="text-xs text-slate-500">
              Solve algorithmic problems with real-time CPython memory tracing and test assertion verification.
            </p>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setSubTab('problems')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              subTab === 'problems'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Coding Challenges
          </button>
          <button
            onClick={() => setSubTab('quiz')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              subTab === 'quiz'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Complexity &amp; Logic Quiz
          </button>
        </div>
      </div>

      {subTab === 'quiz' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <GotchaQuizLab />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Problem Selector & Description (Cols 1-5) */}
          <div className="lg:col-span-5 flex flex-col h-full border-r border-slate-200 bg-white overflow-hidden">
            {/* Problem Selector Dropdown / Search */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Select LeetCode Problem:
              </label>
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
              >
                {problems.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    #{p.number}. {p.title} ({p.difficulty} - {p.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Problem Details Viewport */}
            {activeProblem && (
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {/* Title & Metadata Badges */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      {activeProblem.number}. {activeProblem.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getDifficultyBadge(activeProblem.difficulty)}`}>
                      {activeProblem.difficulty}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200">
                      {activeProblem.category}
                    </span>
                    <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {activeProblem.time_complexity}
                    </span>
                    <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                      <HardDrive className="w-3 h-3 text-slate-400" />
                      {activeProblem.space_complexity}
                    </span>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="text-xs text-slate-700 leading-relaxed font-sans space-y-3 border-t border-slate-100 pt-3">
                  {activeProblem.description.split('\n\n').map((paragraph, pIdx) => {
                    if (paragraph.startsWith('### ')) {
                      return (
                        <h4 key={pIdx} className="text-xs font-bold text-slate-900 uppercase tracking-wider mt-3">
                          {paragraph.replace('### ', '')}
                        </h4>
                      );
                    }
                    if (paragraph.startsWith('```')) {
                      return (
                        <pre key={pIdx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto">
                          {paragraph.replace(/```/g, '').trim()}
                        </pre>
                      );
                    }
                    return <p key={pIdx}>{paragraph}</p>;
                  })}
                </div>

                {/* Hints Accordion */}
                {activeProblem.hints && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowHints(!showHints)}
                      className="flex items-center justify-between w-full p-2.5 rounded-lg bg-amber-50/70 text-amber-900 border border-amber-200 text-xs font-semibold transition hover:bg-amber-100/70"
                    >
                      <span className="flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <span>Algorithm Hint</span>
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHints ? 'rotate-180' : ''}`} />
                    </button>
                    {showHints && (
                      <div className="p-3 bg-amber-50/40 rounded-b-lg border-x border-b border-amber-200 text-xs text-amber-900 leading-relaxed">
                        {activeProblem.hints}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Code Editor & Execution Visualizer (Cols 6-12) */}
          <div className="lg:col-span-7 flex flex-col h-full bg-slate-50/30 overflow-hidden">
            {/* Editor Area */}
            <div className={`p-4 flex flex-col gap-2 transition-all ${showVisualizer ? 'h-[52%]' : 'h-full'}`}>
              <div className="flex-1 overflow-hidden">
                <MonacoCodeEditor
                  code={code}
                  activeLine={activeStep?.line}
                  isLoading={isTracing}
                  isVerifying={isVerifying}
                  hasChallenge={true}
                  isRealTimeActive={false}
                  onChange={setCode}
                  onRunTrace={handleRunAndVisualize}
                  onVerify={handleVerifySolution}
                  onReset={() => activeProblem && setCode(activeProblem.starter_code)}
                />
              </div>

              {/* Verification Result Toast */}
              {verifyResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between shadow-sm transition-all ${
                    verifyResult.passed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {verifyResult.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{verifyResult.message}</span>
                  </div>
                  <button
                    onClick={() => setVerifyResult(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm ml-2"
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>

            {/* Embedded Live Visualizer if toggled */}
            {showVisualizer && (
              <div className="flex-1 flex flex-col border-t border-slate-200 bg-white overflow-hidden shadow-inner">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Live Algorithm Memory Visualizer
                  </span>
                  <button
                    onClick={() => setShowVisualizer(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Close Canvas
                  </button>
                </div>

                <div className="flex-1 overflow-auto">
                  <MemoryGraph step={activeStep} />
                </div>

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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
