import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  AlertTriangle,
  Trophy,
  Edit3,
  Check,
  Save,
  Loader2
} from 'lucide-react';
import type { TopicModuleDetail } from '../types';

interface TheoryGuideProps {
  module: TopicModuleDetail;
  onSaveNotes: (notes: string) => Promise<void>;
}

export const TheoryGuide: React.FC<TheoryGuideProps> = ({ module, onSaveNotes }) => {
  const [activeTab, setActiveTab] = useState<'theory' | 'gotchas' | 'challenge' | 'notes'>('theory');
  const [notes, setNotes] = useState(module.progress.user_notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccessfully, setNotesSavedSuccessfully] = useState(false);

  useEffect(() => {
    setNotes(module.progress.user_notes || '');
  }, [module.slug]);

  const handleNotesChange = (val: string) => {
    setNotes(val);
    setNotesSavedSuccessfully(false);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await onSaveNotes(notes);
      setNotesSavedSuccessfully(true);
      setTimeout(() => setNotesSavedSuccessfully(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Simple Markdown formatter for previewing code blocks, lists, and headers
  const renderFormattedMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    lines.forEach((line, index) => {
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${index}`}
              className="p-3 my-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto shadow-inner"
            >
              <code>{codeBuffer.join('\n')}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-xl font-bold text-slate-100 mt-4 mb-2">
            {line.replace('# ', '')}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-base font-bold text-sky-300 mt-4 mb-2">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-sm font-semibold text-amber-300 mt-3 mb-1">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={index} className="text-xs text-slate-300 ml-4 list-disc my-1">
            {line.replace('- ', '')}
          </li>
        );
      } else if (line.trim().length === 0) {
        elements.push(<div key={index} className="h-2" />);
      } else {
        elements.push(
          <p key={index} className="text-xs text-slate-300 leading-relaxed my-1">
            {line}
          </p>
        );
      }
    });

    if (inCodeBlock && codeBuffer.length > 0) {
      elements.push(
        <pre
          key="code-final"
          className="p-3 my-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto"
        >
          <code>{codeBuffer.join('\n')}</code>
        </pre>
      );
    }

    return elements;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('theory')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'theory'
                ? 'border-sky-400 text-sky-400 bg-sky-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Deep Theory</span>
          </button>

          <button
            onClick={() => setActiveTab('gotchas')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'gotchas'
                ? 'border-amber-400 text-amber-400 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Gotchas &amp; Traps</span>
          </button>

          <button
            onClick={() => setActiveTab('challenge')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'challenge'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Logic Challenge</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'notes'
                ? 'border-purple-400 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>My Notes</span>
          </button>
        </div>

        {activeTab === 'notes' && (
          <button
            onClick={handleSaveNotes}
            disabled={isSavingNotes}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-purple-600 hover:bg-purple-500 text-white font-medium transition disabled:opacity-50"
          >
            {isSavingNotes ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : notesSavedSuccessfully ? (
              <Check className="w-3 h-3 text-white" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            <span>{notesSavedSuccessfully ? 'Saved!' : 'Save'}</span>
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'theory' && (
          <div className="prose prose-invert max-w-none">
            {renderFormattedMarkdown(module.theory_markdown)}
          </div>
        )}

        {activeTab === 'gotchas' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">CPython Edge Case Alert</p>
                <p className="text-amber-300/80 mt-0.5">
                  The following behaviors are counter-intuitive quirks of CPython&apos;s memory layout and bytecode design.
                </p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              {renderFormattedMarkdown(module.gotchas_markdown)}
            </div>
          </div>
        )}

        {activeTab === 'challenge' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-200 flex items-start gap-2">
              <Trophy className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Logic Building Challenge</p>
                <p className="text-emerald-300/80 mt-0.5">
                  Write your solution in the code editor below, then click &quot;Verify Tests&quot; to execute automated assertion test cases.
                </p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              {renderFormattedMarkdown(module.challenge_prompt)}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="flex flex-col h-full space-y-2">
            <p className="text-xs text-slate-400">
              Record personal insights, mental models, or execution observations. Notes are auto-saved into SQLite.
            </p>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="e.g., In CPython, integer caching covers -5 to 256. Beyond this, two variables holding 257 have different id()..."
              className="w-full h-[240px] p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
