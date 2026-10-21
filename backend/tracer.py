"""
PyMastery Native CPython Execution Tracer Service
Coordinates subprocess execution with strict timeouts and memory isolation.
"""

import sys
import os
import json
import subprocess
from typing import Dict, Any

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
RUNNER_PATH = os.path.join(CURRENT_DIR, "tracer_runner.py")


def execute_trace(code: str, timeout_seconds: float = 3.5) -> Dict[str, Any]:
    """
    Executes user code in a sandboxed subprocess and records a frame-by-frame
    execution trace including Stack, Heap, Pointers, Stdout, Bytecode and Call Tree.
    """
    if not code or not code.strip():
        return {
            "success": False,
            "error_type": "EmptyCodeError",
            "error_message": "No Python code provided to execute.",
            "steps": [],
            "call_tree": []
        }

    payload = json.dumps({"code": code})

    try:
        proc = subprocess.run(
            [sys.executable, RUNNER_PATH],
            input=payload,
            text=True,
            capture_output=True,
            timeout=timeout_seconds,
            cwd=CURRENT_DIR
        )

        if proc.returncode != 0 and not proc.stdout.strip():
            return {
                "success": False,
                "error_type": "RuntimeSubprocessError",
                "error_message": proc.stderr.strip() or f"Process exited with code {proc.returncode}",
                "steps": [],
                "call_tree": []
            }

        try:
            result = json.loads(proc.stdout)
            return result
        except json.JSONDecodeError:
            return {
                "success": False,
                "error_type": "OutputParseError",
                "error_message": f"Failed to parse trace output. Raw output: {proc.stdout[:200]}",
                "steps": [],
                "call_tree": []
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error_type": "TimeoutError",
            "error_message": f"Execution timed out (exceeded {timeout_seconds}s limit). Check for infinite loops (e.g. 'while True:' or unbounded recursion).",
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
