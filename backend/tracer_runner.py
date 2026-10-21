"""
PyMastery Native CPython Execution Tracer Runner
Executes user code under sys.settrace() and outputs JSON execution trace.
"""

import sys
import os
import io
import json
import dis
import inspect
import types
import traceback
from typing import Any, Dict, List, Set, Optional


MAX_STEPS = 400
MAX_REPR_LEN = 80
MAX_CONTAINER_ITEMS = 50


def is_mutable_type(obj: Any) -> bool:
    if isinstance(obj, (int, float, str, bool, type(None), bytes, tuple, frozenset)):
        return False
    return True


def is_small_integer(obj: Any) -> bool:
    # Strictly for integers in the CPython pre-allocated cache [-5, 256]
    return isinstance(obj, int) and -5 <= obj <= 256 and not isinstance(obj, bool)


def is_interned_string(obj: Any) -> bool:
    if isinstance(obj, str) and len(obj) < 80:
        try:
            return sys.intern(obj) is obj
        except Exception:
            return False
    return False


class TraceRecorder:
    def __init__(self, filename: str = "<user_code>"):
        self.filename = filename
        self.steps: List[Dict[str, Any]] = []
        self.step_count = 0
        self.stdout_capture = io.StringIO()
        self.real_stdout = sys.stdout
        self.call_tree_nodes: Dict[int, Dict[str, Any]] = {}
        self.call_stack_history: List[int] = []
        self.next_node_id = 1
        self.code_instructions_cache: Dict[Any, List[Dict[str, Any]]] = {}

    def get_bytecode_for_code(self, code_obj: types.CodeType, current_offset: Optional[int] = None) -> List[Dict[str, Any]]:
        cache_key = id(code_obj)
        if cache_key not in self.code_instructions_cache:
            instructions = []
            for inst in dis.get_instructions(code_obj):
                instructions.append({
                    "offset": inst.offset,
                    "opname": inst.opname,
                    "argval": str(inst.argval) if inst.argval is not None else "",
                    "argrepr": inst.argrepr or "",
                    "starts_line": inst.starts_line,
                    "line_number": inst.starts_line
                })
            self.code_instructions_cache[cache_key] = instructions

        cached = self.code_instructions_cache[cache_key]
        result = []
        for inst in cached:
            item = dict(inst)
            item["is_current"] = (inst["offset"] == current_offset) if current_offset is not None else False
            result.append(item)
        return result

    def inspect_heap_object(self, obj: Any, heap: Dict[str, Any], visited_ids: Set[int]):
        obj_id = id(obj)
        if obj_id in visited_ids:
            return str(obj_id)
        visited_ids.add(obj_id)

        obj_type = type(obj).__name__
        obj_repr = repr(obj)
        if len(obj_repr) > MAX_REPR_LEN:
            obj_repr = obj_repr[:MAX_REPR_LEN] + "..."

        is_mut = is_mutable_type(obj)
        # reference count (subtract 1 for the inspect reference)
        try:
            raw_ref_count = sys.getrefcount(obj) - 1
        except Exception:
            raw_ref_count = 1

        # CPython 3.12+ PEP 683 immortal objects have huge ref counts (~4.2 billion)
        is_immortal = (raw_ref_count > 1_000_000)
        display_ref_count = "∞" if is_immortal else max(1, raw_ref_count)

        is_small_int = is_small_integer(obj)
        is_interned = is_interned_string(obj)

        heap_entry: Dict[str, Any] = {
            "id": str(obj_id),
            "type": obj_type,
            "repr": obj_repr,
            "is_mutable": is_mut,
            "is_small_int": is_small_int,
            "is_interned": is_interned,
            "is_immortal": is_immortal,
            "ref_count": display_ref_count,
            "references_ids": [],
        }

        # Detailed serialization based on type
        if isinstance(obj, (list, tuple, set, frozenset)):
            elements = []
            ref_ids = []
            for idx, item in enumerate(list(obj)[:MAX_CONTAINER_ITEMS]):
                child_id = self.inspect_heap_object(item, heap, visited_ids)
                ref_ids.append(child_id)
                elements.append({
                    "index": idx,
                    "object_id": child_id,
                    "repr": repr(item)[:40]
                })
            heap_entry["elements"] = elements
            heap_entry["references_ids"] = ref_ids
            heap_entry["length"] = len(obj)

        elif isinstance(obj, dict):
            entries = []
            ref_ids = []
            for k, v in list(obj.items())[:MAX_CONTAINER_ITEMS]:
                k_id = self.inspect_heap_object(k, heap, visited_ids)
                v_id = self.inspect_heap_object(v, heap, visited_ids)
                ref_ids.extend([k_id, v_id])
                entries.append({
                    "key_id": k_id,
                    "key_repr": repr(k)[:30],
                    "val_id": v_id,
                    "val_repr": repr(v)[:40]
                })
            heap_entry["entries"] = entries
            heap_entry["references_ids"] = ref_ids
            heap_entry["length"] = len(obj)

        elif isinstance(obj, type):
            # Class object
            heap_entry["is_class"] = True
            heap_entry["mro"] = [cls.__name__ for cls in obj.__mro__]
            heap_entry["bases"] = [base.__name__ for base in obj.__bases__]

        elif hasattr(obj, "__dict__") and not isinstance(obj, (types.ModuleType, types.FunctionType)):
            # Custom instance
            heap_entry["class_name"] = obj.__class__.__name__
            attrs = {}
            ref_ids = []
            try:
                for k, v in list(obj.__dict__.items())[:MAX_CONTAINER_ITEMS]:
                    v_id = self.inspect_heap_object(v, heap, visited_ids)
                    ref_ids.append(v_id)
                    attrs[k] = {
                        "object_id": v_id,
                        "repr": repr(v)[:40]
                    }
            except Exception:
                pass
            heap_entry["attributes"] = attrs
            heap_entry["references_ids"] = ref_ids

        elif isinstance(obj, types.FunctionType):
            heap_entry["func_name"] = obj.__name__
            if obj.__closure__:
                closure_cells = []
                ref_ids = []
                for cell in obj.__closure__:
                    try:
                        content = cell.cell_contents
                        c_id = self.inspect_heap_object(content, heap, visited_ids)
                        ref_ids.append(c_id)
                        closure_cells.append({"cell_id": c_id, "repr": repr(content)[:40]})
                    except ValueError:
                        closure_cells.append({"empty": True})
                heap_entry["closure_cells"] = closure_cells
                heap_entry["references_ids"] = ref_ids

        heap[str(obj_id)] = heap_entry
        return str(obj_id)

    def capture_step(self, frame: types.FrameType, event: str, arg: Any = None):
        if self.step_count >= MAX_STEPS:
            return

        # Filter out frames outside user code
        if frame.f_code.co_filename != self.filename:
            return

        self.step_count += 1

        # Build stack frames list from bottom to top
        stack_frames: List[Dict[str, Any]] = []
        heap: Dict[str, Any] = {}
        visited_ids: Set[int] = set()
        algorithm_pointers: Dict[str, Any] = {}

        curr = frame
        frames_hierarchy: List[types.FrameType] = []
        while curr is not None:
            if curr.f_code.co_filename == self.filename:
                frames_hierarchy.insert(0, curr)
            curr = curr.f_back

        for f in frames_hierarchy:
            f_locals = {}
            for name, val in list(f.f_locals.items()):
                # ignore all system/magic internal keys (__name__, __doc__, __file__, etc.)
                if name.startswith("__") and name.endswith("__"):
                    continue

                val_id = self.inspect_heap_object(val, heap, visited_ids)
                val_repr = repr(val)
                if len(val_repr) > MAX_REPR_LEN:
                    val_repr = val_repr[:MAX_REPR_LEN] + "..."

                f_locals[name] = {
                    "type": type(val).__name__,
                    "repr": val_repr,
                    "object_id": val_id,
                    "is_mutable": is_mutable_type(val)
                }

                # Algorithmic pointer detection
                lower_name = name.lower()
                if lower_name in ("left", "right", "mid", "i", "j", "k", "low", "high", "window", "start", "end", "slow", "fast", "pivot"):
                    if isinstance(val, int):
                        algorithm_pointers[name] = val
                elif lower_name in ("arr", "nums", "items", "data", "array", "lst") and isinstance(val, (list, tuple)):
                    algorithm_pointers["_active_array"] = {
                        "name": name,
                        "length": len(val),
                        "items": [repr(x) for x in list(val)[:20]]
                    }

            stack_frames.append({
                "id": str(id(f)),
                "name": f.f_code.co_name,
                "line": f.f_lineno,
                "locals": f_locals
            })

        # Disassembly instructions for the top frame's code
        bytecode = self.get_bytecode_for_code(frame.f_code, frame.f_lasti)

        # Call-tree recording
        tree_node_id = None
        if event == "call":
            node_id = self.next_node_id
            self.next_node_id += 1
            parent_id = self.call_stack_history[-1] if self.call_stack_history else None
            args_snapshot = {}
            for k, v in list(frame.f_locals.items()):
                if not (k.startswith("__") and k.endswith("__")):
                    args_snapshot[k] = repr(v)[:40]

            self.call_tree_nodes[node_id] = {
                "id": node_id,
                "name": frame.f_code.co_name,
                "line": frame.f_lineno,
                "parent_id": parent_id,
                "args": args_snapshot,
                "return_value": None,
                "status": "running"
            }
            self.call_stack_history.append(node_id)
            tree_node_id = node_id
        elif event == "return":
            if self.call_stack_history:
                ret_node_id = self.call_stack_history.pop()
                if ret_node_id in self.call_tree_nodes:
                    self.call_tree_nodes[ret_node_id]["return_value"] = repr(arg)[:40]
                    self.call_tree_nodes[ret_node_id]["status"] = "returned"
                tree_node_id = ret_node_id
        else:
            tree_node_id = self.call_stack_history[-1] if self.call_stack_history else None

        step_data = {
            "step": self.step_count,
            "line": frame.f_lineno,
            "event": event,
            "func_name": frame.f_code.co_name,
            "stack_frames": stack_frames,
            "heap_objects": heap,
            "stdout": self.stdout_capture.getvalue(),
            "bytecode": bytecode,
            "call_depth": len(frames_hierarchy),
            "active_node_id": tree_node_id,
            "algorithm_pointers": algorithm_pointers,
            "exception": {
                "type": type(arg[1]).__name__,
                "message": str(arg[1])
            } if event == "exception" and isinstance(arg, tuple) and len(arg) > 1 and arg[1] is not None else None
        }

        self.steps.append(step_data)

    def trace_callback(self, frame: types.FrameType, event: str, arg: Any):
        if self.step_count >= MAX_STEPS:
            return None

        if frame.f_code.co_filename == self.filename:
            self.capture_step(frame, event, arg)
            return self.trace_callback

        return self.trace_callback


def run_traced_code(code_str: str) -> Dict[str, Any]:
    filename = "<user_code>"
    recorder = TraceRecorder(filename=filename)

    syntax_notice = None

    # Compile user code
    try:
        compiled_code = compile(code_str, filename, "exec")
    except SyntaxError as e:
        # Check if the prefix of lines before the syntax error can compile cleanly
        # This handles cases where user is actively typing a new line (e.g. 'def', 'for', 'if', 'a =')
        lines = code_str.splitlines()
        prefix_compiled = None
        if e.lineno and e.lineno > 1 and len(lines) >= e.lineno:
            for cutoff in range(e.lineno - 1, 0, -1):
                prefix_code = "\n".join(lines[:cutoff])
                if prefix_code.strip():
                    try:
                        prefix_compiled = compile(prefix_code, filename, "exec")
                        incomplete_line = lines[e.lineno - 1].strip() if e.lineno - 1 < len(lines) else ""
                        syntax_notice = f"Line {e.lineno}: Incomplete syntax ('{incomplete_line}'). Live trace active through line {cutoff}."
                        compiled_code = prefix_compiled
                        break
                    except SyntaxError:
                        continue

        if prefix_compiled is None:
            return {
                "success": False,
                "error_type": "SyntaxError",
                "error_message": f"SyntaxError on line {e.lineno}: {e.msg}",
                "steps": [],
                "call_tree": []
            }
    except Exception as e:
        return {
            "success": False,
            "error_type": type(e).__name__,
            "error_message": str(e),
            "steps": [],
            "call_tree": []
        }

    # Intercept stdout
    old_stdout = sys.stdout
    sys.stdout = recorder.stdout_capture

    global_env = {
        "__name__": "__main__",
        "__file__": filename,
        "__builtins__": __builtins__,
    }

    error_info = None

    try:
        sys.settrace(recorder.trace_callback)
        exec(compiled_code, global_env)
    except Exception as e:
        exc_type, exc_val, exc_tb = sys.exc_info()
        tb_lines = traceback.format_exception(exc_type, exc_val, exc_tb)
        # extract user code line if available
        user_line = None
        for frame_summary in traceback.extract_tb(exc_tb):
            if frame_summary.filename == filename:
                user_line = frame_summary.lineno

        error_info = {
            "type": exc_type.__name__ if exc_type else "Exception",
            "message": str(exc_val),
            "line": user_line,
            "traceback": "".join(tb_lines[-4:])
        }
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout

    return {
        "success": error_info is None,
        "steps": recorder.steps,
        "call_tree": list(recorder.call_tree_nodes.values()),
        "total_steps": len(recorder.steps),
        "stdout": recorder.stdout_capture.getvalue(),
        "error": error_info,
        "syntax_notice": syntax_notice,
        "max_steps_reached": recorder.step_count >= MAX_STEPS
    }


if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        payload = json.loads(input_data)
        code = payload.get("code", "")
        result = run_traced_code(code)
        print(json.dumps(result))
    except Exception as e:
        err_res = {
            "success": False,
            "error_type": type(e).__name__,
            "error_message": str(e),
            "steps": [],
            "call_tree": []
        }
        print(json.dumps(err_res))
