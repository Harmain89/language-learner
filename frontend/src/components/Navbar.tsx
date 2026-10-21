import React from 'react';
import { Trophy, Zap, Terminal } from 'lucide-react';

interface NavbarProps {
  activeTab: 'visualizer' | 'leetcode';
  onTabChange: (tab: 'visualizer' | 'leetcode') => void;
  isRealTimeActive: boolean;
  onToggleRealTime: () => void;
  isTracing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  isRealTimeActive,
  onToggleRealTime,
  isTracing,
}) => {
  return (
    <header className="h-14 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between px-5 z-20 select-none shadow-xs">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-sky-500 shadow-md shadow-indigo-500/20 text-white font-black text-sm tracking-wider">
          Py
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight text-slate-900">
              PyMastery <span className="text-indigo-600">Studio</span>
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              CPython Engine
            </span>
          </div>
          <span className="text-[10px] text-slate-500 hidden sm:block">
            100% Native Execution Trace &amp; Logic Visualizer
          </span>
        </div>
      </div>

      {/* Main Mode Switcher Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => onTabChange('visualizer')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'visualizer'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-indigo-600" />
          <span>Real-Time Visualizer</span>
        </button>

        <button
          onClick={() => onTabChange('leetcode')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'leetcode'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>LeetCode Arena &amp; Quiz</span>
        </button>
      </div>

      {/* Right Controls: Real-Time Engine Indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleRealTime}
          title="Toggle live execution trace while typing"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
            isRealTimeActive
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isRealTimeActive
                ? isTracing
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-emerald-500 animate-pulse'
                : 'bg-slate-400'
            }`}
          />
          <span className="hidden md:inline">
            {isRealTimeActive
              ? isTracing
                ? 'Tracing...'
                : 'Live Trace: Real-Time'
              : 'Manual Trace'}
          </span>
        </button>

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span>Python 3.13</span>
        </div>
      </div>
    </header>
  );
};
