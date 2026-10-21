import React, { useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  FileCode,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface MonacoCodeEditorProps {
  code: string;
  activeLine?: number;
  isLoading: boolean;
  isVerifying: boolean;
  hasChallenge: boolean;
  isRealTimeActive?: boolean;
  syntaxNotice?: string | null;
  onChange: (value: string) => void;
  onRunTrace: () => void;
  onVerify?: () => void;
  onReset: () => void;
  onCursorLineChange?: (line: number) => void;
}

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({
  code,
  activeLine,
  isLoading,
  isVerifying,
  hasChallenge,
  isRealTimeActive = true,
  syntaxNotice,
  onChange,
  onRunTrace,
  onVerify,
  onReset,
  onCursorLineChange,
}) => {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const [copied, setCopied] = React.useState(false);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define crisp modern light studio theme
    monaco.editor.defineTheme('pymastery-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '7c3aed', fontStyle: 'bold' },
        { token: 'identifier', foreground: '0f172a' },
        { token: 'string', foreground: '059669' },
        { token: 'number', foreground: 'd97706' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.lineHighlightBackground': '#f1f5f9',
        'editorLineNumber.foreground': '#94a3b8',
        'editorLineNumber.activeForeground': '#4f46e5',
      }
    });

    monaco.editor.setTheme('pymastery-light');

    // Ctrl+Enter shortcut for manual trace
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunTrace();
    });

    // Listen to cursor line changes for live visualization synchronization
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorLineChange) {
        onCursorLineChange(e.position.lineNumber);
      }
    });
  };

  // Update active line decoration
  useEffect(() => {
    if (!editorRef.current) return;

    if (activeLine && activeLine > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        [
          {
            range: {
              startLineNumber: activeLine,
              startColumn: 1,
              endLineNumber: activeLine,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              className: 'bg-indigo-50 border-l-4 border-indigo-600',
              glyphMarginClassName: 'text-indigo-600',
            },
          },
        ]
      );

      editorRef.current.revealLineInCenterIfOutsideViewport(activeLine);
    } else {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        []
      );
    }
  }, [activeLine]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2.5">
          <FileCode className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800 tracking-tight">
            Python Live Editor
          </span>

          {isRealTimeActive && !syntaxNotice && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Visualizer Active
            </span>
          )}

          {syntaxNotice && (
            <span
              className="flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200"
              title={syntaxNotice}
            >
              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="truncate max-w-[200px]">{syntaxNotice}</span>
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
            title="Copy Code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 shadow-2xs transition"
            title="Reset code"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {hasChallenge && onVerify && (
            <button
              onClick={onVerify}
              disabled={isVerifying || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition disabled:opacity-50 shadow-sm"
              title="Verify Code against Automated Tests"
            >
              {isVerifying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Submit Solution</span>
            </button>
          )}

          <button
            onClick={onRunTrace}
            disabled={isLoading || isVerifying}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-50 shadow-sm shadow-indigo-200 active:scale-95 transform"
            title="Execute &amp; Record CPython Trace"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run &amp; Visualize</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor Canvas */}
      <div className="flex-1 w-full min-h-[300px]">
        <Editor
          height="100%"
          language="python"
          value={code}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 4,
            cursorBlinking: 'smooth',
            renderLineHighlight: 'all',
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
};
