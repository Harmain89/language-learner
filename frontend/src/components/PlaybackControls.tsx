import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Activity
} from 'lucide-react';
import type { TraceStep } from '../types';

interface PlaybackControlsProps {
  currentStepIndex: number;
  totalSteps: number;
  currentStep?: TraceStep;
  isPlaying: boolean;
  playbackSpeed: number;
  onStepChange: (index: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentStepIndex,
  totalSteps,
  currentStep,
  isPlaying,
  playbackSpeed,
  onStepChange,
  onTogglePlay,
  onSpeedChange,
}) => {
  if (totalSteps === 0) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-slate-200 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          Execution engine ready. Type any Python code on the left to visualize instantly.
        </span>
      </div>
    );
  }

  const getEventBadgeColor = (event?: string) => {
    switch (event) {
      case 'call':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'return':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'exception':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-slate-200 select-none shadow-2xs">
      {/* Left: Transport buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onStepChange(0)}
          disabled={currentStepIndex === 0}
          title="First Step"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
          disabled={currentStepIndex === 0}
          title="Previous Step"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onTogglePlay}
          title={isPlaying ? "Pause" : "Play"}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-100 transition transform active:scale-95"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => onStepChange(Math.min(totalSteps - 1, currentStepIndex + 1))}
          disabled={currentStepIndex >= totalSteps - 1}
          title="Next Step"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onStepChange(totalSteps - 1)}
          disabled={currentStepIndex >= totalSteps - 1}
          title="Last Step"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Step indicator */}
        <span className="ml-2 font-mono text-xs text-slate-600 tracking-wider">
          Step <strong className="text-indigo-600">{currentStepIndex + 1}</strong> of {totalSteps}
        </span>
      </div>

      {/* Middle: Scrubber slider */}
      <div className="flex-1 max-w-xs sm:max-w-md mx-2 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={totalSteps - 1}
          value={currentStepIndex}
          onChange={(e) => onStepChange(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition"
        />
      </div>

      {/* Right: State metadata & Speed */}
      <div className="flex items-center gap-2 text-xs">
        {currentStep && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-mono text-[11px]">
              Line <strong className="text-slate-900">{currentStep.line}</strong>
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md border ${getEventBadgeColor(
                currentStep.event
              )}`}
            >
              {currentStep.event}
            </span>
          </div>
        )}

        {/* Speed selector */}
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <Gauge className="w-3 h-3 text-slate-400 ml-1 mr-0.5" />
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                playbackSpeed === s
                  ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
