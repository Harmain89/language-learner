import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Search,
  BookOpen,
  Zap,
  PlaySquare,
  Layers,
  Compass,
  GitCommit,
  Terminal
} from 'lucide-react';
import type { Tier } from '../types';

interface CurriculumSidebarProps {
  tiers: Tier[];
  currentModuleSlug: string;
  activeMode: 'lesson' | 'gotchas' | 'playground';
  onSelectModule: (slug: string) => void;
  onSelectMode: (mode: 'lesson' | 'gotchas' | 'playground') => void;
}

export const CurriculumSidebar: React.FC<CurriculumSidebarProps> = ({
  tiers,
  currentModuleSlug,
  activeMode,
  onSelectModule,
  onSelectMode,
}) => {
  const [expandedTiers, setExpandedTiers] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const toggleTier = (num: number) => {
    setExpandedTiers((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  const getVisualizerIcon = (mode: string) => {
    switch (mode) {
      case 'recursion':
        return <GitCommit className="w-3 h-3 text-purple-400" />;
      case 'algorithm':
        return <Compass className="w-3 h-3 text-amber-400" />;
      case 'bytecode':
        return <Terminal className="w-3 h-3 text-sky-400" />;
      default:
        return <Layers className="w-3 h-3 text-emerald-400" />;
    }
  };

  const filteredTiers = tiers.map((tier) => ({
    ...tier,
    modules: tier.modules.filter(
      (m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tier.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  }));

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 select-none">
      {/* Platform Mode Switcher */}
      <div className="p-3 border-b border-slate-800 space-y-1">
        <button
          onClick={() => onSelectMode('lesson')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            activeMode === 'lesson'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>Curriculum Studio (6 Tiers)</span>
        </button>

        <button
          onClick={() => onSelectMode('gotchas')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            activeMode === 'gotchas'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Gotchas &amp; Quiz Lab</span>
        </button>

        <button
          onClick={() => onSelectMode('playground')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            activeMode === 'playground'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <PlaySquare className="w-3.5 h-3.5 text-purple-400" />
          <span>Free Sandbox Playground</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-800/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search concepts, gotchas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Curriculum Accordion List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredTiers.map((tier) => {
          const isExpanded = expandedTiers[tier.number] ?? true;
          const completedCount = tier.modules.filter((m) => m.status === 'completed').length;

          return (
            <div key={tier.id} className="rounded-lg border border-slate-900 bg-slate-950/60 overflow-hidden">
              {/* Tier Header */}
              <button
                onClick={() => toggleTier(tier.number)}
                className="w-full flex items-center justify-between p-2 text-left hover:bg-slate-900/60 transition"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-200 truncate">
                    Tier {tier.number}: {tier.title.split(':')[1] || tier.title}
                  </span>
                </div>

                <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.2 rounded bg-slate-900 shrink-0">
                  {completedCount}/{tier.modules.length}
                </span>
              </button>

              {/* Module Items */}
              {isExpanded && (
                <div className="p-1 space-y-0.5">
                  {tier.modules.map((mod) => {
                    const isSelected = currentModuleSlug === mod.slug && activeMode === 'lesson';
                    const isCompleted = mod.status === 'completed';

                    return (
                      <button
                        key={mod.id}
                        onClick={() => {
                          onSelectMode('lesson');
                          onSelectModule(mod.slug);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition text-left ${
                          isSelected
                            ? 'bg-sky-500/20 text-sky-200 font-semibold border border-sky-500/40'
                            : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-3 h-3 text-slate-600 shrink-0" />
                          )}
                          <span className="truncate">{mod.title}</span>
                        </div>

                        <div className="shrink-0 ml-1.5" title={`Visualizer: ${mod.visualizer_mode}`}>
                          {getVisualizerIcon(mod.visualizer_mode)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
