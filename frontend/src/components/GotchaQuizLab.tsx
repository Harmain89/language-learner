import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  BookOpen,
  Award,
  Zap
} from 'lucide-react';
import type { GotchaItem, GotchaCheckResult } from '../types';
import { fetchGotchas, checkGotcha } from '../api';

export const GotchaQuizLab: React.FC = () => {
  const [gotchas, setGotchas] = useState<GotchaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<GotchaCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGotchas()
      .then((data) => setGotchas(data.gotchas))
      .catch((err) => console.error('Failed to load gotchas', err));
  }, []);

  const currentGotcha = gotchas[currentIndex];

  const handleSelectOption = (opt: string) => {
    if (result) return;
    setSelectedOption(opt);
  };

  const handleSubmit = async () => {
    if (!currentGotcha || !selectedOption) return;

    setIsLoading(true);
    try {
      const checkRes = await checkGotcha(currentGotcha.id, selectedOption);
      setResult(checkRes);

      if (checkRes.is_correct && !answeredIds.has(currentGotcha.id)) {
        setScore((prev) => prev + 1);
        setAnsweredIds((prev) => new Set(prev).add(currentGotcha.id));
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setResult(null);
    setCurrentIndex((prev) => (prev + 1) % gotchas.length);
  };

  if (gotchas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500">
        <Zap className="w-10 h-10 mb-3 text-amber-500 animate-bounce" />
        <p className="text-sm font-medium">Loading CPython Gotcha Challenges...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Quiz Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            &quot;What&apos;s the Output &amp; Why?&quot; Logic Quiz Lab
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Test your understanding of counter-intuitive CPython quirks, memory aliasing, mutable traps, and late-binding lambdas.
          </p>
        </div>

        {/* Score Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
          <Award className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-mono text-slate-700">
            Solved: <span className="text-indigo-600 font-bold">{score}</span> / {gotchas.length}
          </span>
        </div>
      </div>

      {/* Question Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
            {currentGotcha.category}
          </span>
          <span className="text-xs font-mono text-slate-400">
            Challenge {currentIndex + 1} of {gotchas.length}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-800">
          {currentGotcha.title}
        </h3>

        {/* Code Snippet Box */}
        <div className="rounded-lg bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-100 overflow-x-auto shadow-inner">
          <pre>{currentGotcha.tricky_code}</pre>
        </div>

        {/* Options Grid */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Select the printed output:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentGotcha.options.map((opt) => {
              const isSelected = selectedOption === opt;
              let borderClass = 'border-slate-200 hover:border-indigo-300 bg-slate-50 text-slate-800';

              if (result) {
                if (opt === result.correct_output) {
                  borderClass = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-1 ring-emerald-500';
                } else if (isSelected && !result.is_correct) {
                  borderClass = 'border-rose-400 bg-rose-50 text-rose-800 ring-1 ring-rose-400';
                } else {
                  borderClass = 'border-slate-200 opacity-40 bg-slate-50 text-slate-400';
                }
              } else if (isSelected) {
                borderClass = 'border-indigo-500 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-500 font-semibold';
              }

              return (
                <button
                  key={opt}
                  onClick={() => handleSelectOption(opt)}
                  disabled={result !== null}
                  className={`p-3 rounded-lg border text-left text-xs font-mono transition-all flex items-center justify-between ${borderClass}`}
                >
                  <span>{opt}</span>
                  {result && opt === result.correct_output && (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                  )}
                  {result && isSelected && !result.is_correct && (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {!result ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedOption || isLoading}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition disabled:opacity-40 shadow-xs shadow-indigo-600/20"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs"
            >
              <span>Next Challenge</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Deep Conceptual Explanation Card */}
        {result && (
          <div
            className={`p-4 rounded-xl border space-y-2 mt-4 transition-all ${
              result.is_correct
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/80 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className={`w-4 h-4 ${result.is_correct ? 'text-emerald-700' : 'text-rose-700'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                CPython Under-the-Hood Explanation
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              {result.deep_explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
