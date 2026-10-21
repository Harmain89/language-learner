"""
PyMastery Challenge Verification Test Runner
Executes user code against test assertions in an isolated subprocess.
"""

import sys
import subprocess
import traceback
from typing import Dict, Any


def verify_code(user_code: str, test_code: str, timeout_seconds: float = 4.0) -> Dict[str, Any]:
    """
    Executes user code concatenated with assertion tests in an isolated subprocess.
    """
    # Create self-contained script using safe concatenation
    script = (
        "import sys\n"
        "import traceback\n\n"
        "env = {'__name__': '__main__', '__builtins__': __builtins__}\n"
        "full_code = " + repr(user_code + "\n\n# --- AUTOMATED TEST SUITE ---\n" + test_code) + "\n\n"
        "try:\n"
        "    exec(full_code, env)\n"
        "    print('ALL_TESTS_PASSED')\n"
        "except AssertionError as ae:\n"
        "    msg = str(ae) if str(ae) else 'Assertion check failed.'\n"
        "    sys.stderr.write('AssertionError: ' + msg + '\\n')\n"
        "    sys.exit(1)\n"
        "except Exception as e:\n"
        "    exc_type, exc_val, exc_tb = sys.exc_info()\n"
        "    tb_str = ''.join(traceback.format_exception(exc_type, exc_val, exc_tb)[-3:])\n"
        "    sys.stderr.write(exc_type.__name__ + ': ' + str(exc_val) + '\\n' + tb_str + '\\n')\n"
        "    sys.exit(2)\n"
    )

    try:
        proc = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            timeout=timeout_seconds
        )

        stdout = proc.stdout.strip()
        stderr = proc.stderr.strip()

        if proc.returncode == 0 and "ALL_TESTS_PASSED" in stdout:
            return {
                "passed": True,
                "message": "All test assertions passed successfully! Great work!",
                "details": stdout.replace("ALL_TESTS_PASSED", "").strip()
            }
        else:
            return {
                "passed": False,
                "message": stderr or "Tests failed. Review your code logic and assertions.",
                "details": stdout
            }

    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "message": "Execution timed out. Please check for infinite loops or heavy computations.",
            "details": f"Timeout expired after {timeout_seconds} seconds."
        }
    except Exception as e:
        return {
            "passed": False,
            "message": f"Verification error: {str(e)}",
            "details": traceback.format_exc()
        }
