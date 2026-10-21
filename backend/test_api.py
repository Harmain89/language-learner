from fastapi.testclient import TestClient
from backend.main import app

def run_tests():
    with TestClient(app) as client:
        # 1. Health
        h = client.get("/api/health")
        assert h.status_code == 200, f"Health check failed: {h.text}"
        print("PASS: /api/health:", h.json())

        # 2. Curriculum
        curr = client.get("/api/curriculum").json()
        tiers = curr.get("tiers", [])
        assert len(tiers) == 6, f"Expected 6 tiers, got {len(tiers)}"
        total_mods = sum(len(t["modules"]) for t in tiers)
        print(f"PASS: 6 Tiers seeded with {total_mods} total TopicModules!")

        # 3. Module Details
        first_slug = tiers[0]["modules"][0]["slug"]
        mod_res = client.get(f"/api/curriculum/{first_slug}")
        assert mod_res.status_code == 200, f"Module detail failed: {mod_res.text}"
        mod_data = mod_res.json()
        assert "theory_markdown" in mod_data, "Missing theory markdown"
        assert "starter_code" in mod_data, "Missing starter code"
        print(f"PASS: Module details for '{first_slug}' fetched cleanly!")

        # 4. Trace execution
        trace_req = {
            "code": "x = 10\ny = [x, 20]\ny.append(30)\nprint('Done y:', y)"
        }
        trace_res = client.post("/api/execute/trace", json=trace_req)
        assert trace_res.status_code == 200, f"Trace failed: {trace_res.text}"
        trace_data = trace_res.json()
        assert trace_data.get("success") is True, f"Trace returned failure: {trace_data}"
        assert len(trace_data.get("steps", [])) > 0, "No trace steps returned"
        print(f"PASS: Trace engine executed successfully with {len(trace_data['steps'])} steps!")

        # 5. Gotchas
        gotchas = client.get("/api/gotchas").json().get("gotchas", [])
        assert len(gotchas) > 0, "No gotchas returned"
        print(f"PASS: /api/gotchas loaded {len(gotchas)} tricky challenges!")

        # 6. Verify Challenge
        verify_req = {
            "slug": first_slug,
            "code": "def detect_aliasing(items_list):\n    res = []\n    for i in range(len(items_list)):\n        for j in range(i+1, len(items_list)):\n            if items_list[i] is items_list[j]:\n                res.append((i, j))\n    return res"
        }
        verify_res = client.post("/api/execute/verify", json=verify_req)
        assert verify_res.status_code == 200, f"Verify failed: {verify_res.text}"
        v_data = verify_res.json()
        assert v_data.get("passed") is True, f"Challenge solution failed: {v_data}"
        print("PASS: Automated challenge verification passed successfully!")

        print("\nALL BACKEND API AND TRACE TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
