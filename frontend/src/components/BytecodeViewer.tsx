import React from 'react';
import { Terminal, Binary, ArrowRight } from 'lucide-react';
import type { TraceStep } from '../types';

interface BytecodeViewerProps {
  step?: TraceStep;
}

const OPCODE_DESCRIPTIONS: Record<string, string> = {
  'RESUME': 'Generator/coroutine resume point marker in Python 3.11+.',
  'LOAD_CONST': 'Pushes a constant literal (number, string, None) onto the evaluation stack.',
  'LOAD_FAST': 'Pushes a reference to a local variable onto the evaluation stack in O(1) time.',
  'STORE_FAST': 'Pops the top value from the evaluation stack and stores it into a local variable.',
  'LOAD_GLOBAL': 'Loads a global or builtin variable into the evaluation stack.',
  'STORE_GLOBAL': 'Stores the top of stack value into the global namespace.',
  'LOAD_NAME': 'Pushes the value associated with a name onto the stack.',
  'STORE_NAME': 'Stores the top value from the stack into the local/module dictionary by name.',
  'BINARY_OP': 'Pops two operands, executes the binary operation (add, sub, mul, etc.), and pushes the result.',
  'INPLACE_ADD': 'Executes in-place addition (__iadd__) on the mutable object or falls back to __add__.',
  'BUILD_LIST': 'Pops N items from the stack and creates a new PyListObject on the heap.',
  'BUILD_TUPLE': 'Pops N items from the stack and creates an immutable PyTupleObject.',
  'BUILD_MAP': 'Pops 2*N items from the stack and creates a new PyDictObject compact hash table.',
  'CALL': 'Calls a callable object (function, method) with arguments and pushes the return value.',
  'RETURN_VALUE': 'Returns the top of stack value to the caller and terminates the current frame.',
  'RETURN_CONST': 'Pushes and returns a constant directly in Python 3.12+.',
  'COMPARE_OP': 'Performs a comparison operation between two operands.',
  'POP_JUMP_IF_FALSE': 'Pops value; if falsy, jumps instruction pointer to target offset.',
  'POP_JUMP_IF_TRUE': 'Pops value; if truthy, jumps instruction pointer to target offset.',
  'MAKE_FUNCTION': 'Pushes a new function object onto the stack, binding code object and closures.',
};

export const BytecodeViewer: React.FC<BytecodeViewerProps> = ({ step }) => {
  const instructions = step?.bytecode || [];

  if (instructions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16 bg-slate-50/50">
        <Binary className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">No bytecode disassembled</p>
        <p className="text-xs text-slate-400 mt-1">Execute Python code to inspect CPython VM instruction opcodes.</p>
      </div>
    );
  }

  const activeLine = step?.line;

  return (
    <div className="w-full h-full min-h-[460px] p-6 overflow-auto bg-slate-50/40 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <span className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Terminal className="w-4 h-4 text-indigo-600" />
          CPython Virtual Machine (Eval Loop) Bytecode
        </span>
        <span className="text-xs font-mono text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
          Active Source Line: <strong className="text-indigo-600">{activeLine}</strong>
        </span>
      </div>

      {/* Bytecode Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3 w-16">Offset</th>
              <th className="py-2.5 px-3 w-16">Line</th>
              <th className="py-2.5 px-4">Opcode</th>
              <th className="py-2.5 px-4">Arg / Repr</th>
              <th className="py-2.5 px-4 hidden md:table-cell">CPython VM Mechanic</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {instructions.map((inst) => {
              const isActive = inst.is_current || (activeLine && inst.starts_line === activeLine);
              const opExplanation = OPCODE_DESCRIPTIONS[inst.opname] || 'Virtual machine instruction.';

              return (
                <tr
                  key={inst.offset}
                  className={`transition-colors ${
                    isActive
                      ? 'bg-indigo-50/70 text-indigo-950 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50/70'
                  }`}
                >
                  {/* Offset */}
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {isActive && <ArrowRight className="w-3.5 h-3.5 text-indigo-600 animate-pulse shrink-0" />}
                      <span>{inst.offset}</span>
                    </div>
                  </td>

                  {/* Line Number */}
                  <td className="py-2.5 px-3">
                    {inst.starts_line ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {String(inst.starts_line)}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* Opcode */}
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-xs ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : 'text-slate-800'
                      }`}
                    >
                      {inst.opname}
                    </span>
                  </td>

                  {/* Arg & Repr */}
                  <td className="py-2.5 px-4 text-emerald-700 font-medium">
                    {inst.argrepr || inst.argval || ''}
                  </td>

                  {/* Explanation */}
                  <td className="py-2.5 px-4 text-slate-500 text-[11px] font-sans hidden md:table-cell">
                    {opExplanation}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
