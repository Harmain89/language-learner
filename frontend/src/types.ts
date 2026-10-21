export interface TopicModuleSummary {
  id: string;
  slug: string;
  title: string;
  visualizer_mode: 'memory' | 'recursion' | 'algorithm' | 'bytecode' | string;
  order_index: number;
  status: 'not_started' | 'in_progress' | 'completed';
  completed_at?: string | null;
}

export interface Tier {
  id: string;
  number: number;
  title: string;
  description: string;
  modules: TopicModuleSummary[];
}

export interface ModuleProgress {
  status: 'not_started' | 'in_progress' | 'completed';
  saved_code?: string | null;
  user_notes: string;
  completed_at?: string | null;
}

export interface TopicModuleDetail {
  id: string;
  tier_id: string;
  tier_number: number;
  tier_title: string;
  slug: string;
  title: string;
  theory_markdown: string;
  gotchas_markdown: string;
  starter_code: string;
  visualizer_mode: 'memory' | 'recursion' | 'algorithm' | 'bytecode';
  challenge_prompt: string;
  test_code: string;
  order_index: number;
  progress: ModuleProgress;
}

export interface VariableInfo {
  type: string;
  repr: string;
  object_id: string;
  is_mutable: boolean;
}

export interface StackFrame {
  id: string;
  name: string;
  line: number;
  locals: Record<string, VariableInfo>;
}

export interface HeapElement {
  index: number;
  object_id: string;
  repr: string;
}

export interface HeapEntry {
  key_id: string;
  key_repr: string;
  val_id: string;
  val_repr: string;
}

export interface HeapObject {
  id: string;
  type: string;
  repr: string;
  is_mutable: boolean;
  is_small_int: boolean;
  is_interned?: boolean;
  is_immortal?: boolean;
  ref_count: number | string;
  references_ids: string[];
  elements?: HeapElement[];
  entries?: HeapEntry[];
  length?: number;
  class_name?: string;
  attributes?: Record<string, { object_id: string; repr: string }>;
  mro?: string[];
  closure_cells?: { cell_id?: string; repr?: string; empty?: boolean }[];
}

export interface BytecodeInstruction {
  offset: number;
  opname: string;
  argval: string;
  argrepr: string;
  starts_line: boolean | number | null;
  line_number: number | null;
  is_current: boolean;
}

export interface CallTreeNode {
  id: number;
  name: string;
  line: number;
  parent_id: number | null;
  args: Record<string, string>;
  return_value: string | null;
  status: 'running' | 'returned';
}

export interface TraceStep {
  step: number;
  line: number;
  event: string;
  func_name: string;
  stack_frames: StackFrame[];
  heap_objects: Record<string, HeapObject>;
  stdout: string;
  bytecode: BytecodeInstruction[];
  call_depth: number;
  active_node_id?: number | null;
  algorithm_pointers: Record<string, any>;
  exception?: {
    type: string;
    message: string;
  } | null;
}

export interface TraceResult {
  success: boolean;
  steps: TraceStep[];
  call_tree: CallTreeNode[];
  total_steps: number;
  stdout: string;
  error?: {
    type: string;
    message: string;
    line?: number;
    traceback?: string;
  } | null;
  error_type?: string;
  error_message?: string;
  syntax_notice?: string | null;
  max_steps_reached?: boolean;
}

export interface VerifyResult {
  passed: boolean;
  message: string;
  details?: string;
}

export interface GotchaItem {
  id: string;
  title: string;
  category: string;
  tricky_code: string;
  options: string[];
}

export interface GotchaCheckResult {
  is_correct: boolean;
  correct_output: string;
  deep_explanation: string;
}

export interface OverallProgress {
  total_modules: number;
  completed_modules: number;
  completion_percentage: number;
}

export interface LeetCodeProblemSummary {
  id: string;
  number: number;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  time_complexity: string;
  space_complexity: string;
  hints?: string;
}

export interface LeetCodeProblemDetail {
  id: string;
  number: number;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  starter_code: string;
  test_code: string;
  time_complexity: string;
  space_complexity: string;
  hints?: string;
}

