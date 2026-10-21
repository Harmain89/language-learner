from backend.tracer import execute_trace

res = execute_trace('a = "ss"\nprint(a)')
print("Total steps:", len(res["steps"]))
last_step = res["steps"][-1]
print("Locals keys in top frame:", list(last_step["stack_frames"][-1]["locals"].keys()))
for obj_id, obj in last_step["heap_objects"].items():
    print(f"Heap: {obj['type']} {obj['repr']} | ref={obj['ref_count']} | small_int={obj['is_small_int']} | interned={obj['is_interned']} | immortal={obj['is_immortal']}")
