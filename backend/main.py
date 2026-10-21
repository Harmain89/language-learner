"""
PyMastery Studio - FastAPI Backend Entrypoint
"""

import os
import json
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .database import engine, get_db, Base
from .models import Tier, TopicModule, GotchaChallenge, UserProgress, ExecutionSnippet, LeetCodeProblem
from .seed_curriculum import seed_database
from .seed_leetcode import seed_leetcode
from .tracer import execute_trace
from .test_runner import verify_code


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created and seeded on startup
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_database(db)
        seed_leetcode(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="PyMastery Studio API",
    description="Interactive Python learning, CPython execution tracing & visual logic platform",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Request & Response Schemas ---

class TraceRequest(BaseModel):
    code: str
    timeout_seconds: Optional[float] = 3.5


class VerifyRequest(BaseModel):
    slug: str
    code: str


class GotchaCheckRequest(BaseModel):
    id: str
    selected_option: str


class ProgressSaveRequest(BaseModel):
    slug: str
    user_notes: Optional[str] = None
    saved_code: Optional[str] = None


class SnippetSaveRequest(BaseModel):
    title: str = "Untitled Playground"
    code: str


# --- API Routes ---

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "PyMastery Studio", "version": "1.0.0"}


@app.get("/api/curriculum")
def get_curriculum(db: Session = Depends(get_db)):
    """
    Returns full list of 6 Tiers with their TopicModules and user completion status.
    """
    tiers = db.query(Tier).order_by(Tier.number).all()
    results = []

    for t in tiers:
        modules_data = []
        for m in sorted(t.modules, key=lambda x: x.order_index):
            progress = db.query(UserProgress).filter(UserProgress.module_id == m.id).first()
            modules_data.append({
                "id": m.id,
                "slug": m.slug,
                "title": m.title,
                "visualizer_mode": m.visualizer_mode,
                "order_index": m.order_index,
                "status": progress.status if progress else "not_started",
                "completed_at": progress.completed_at.isoformat() if progress and progress.completed_at else None
            })

        results.append({
            "id": t.id,
            "number": t.number,
            "title": t.title,
            "description": t.description,
            "modules": modules_data
        })

    return {"tiers": results}


@app.get("/api/curriculum/{slug}")
def get_module_details(slug: str, db: Session = Depends(get_db)):
    """
    Returns detailed lesson content, theory, gotchas, starter code, and saved progress.
    """
    module = db.query(TopicModule).filter(TopicModule.slug == slug).first()
    if not module:
        raise HTTPException(status_code=404, detail="Topic module not found")

    progress = db.query(UserProgress).filter(UserProgress.module_id == module.id).first()

    return {
        "id": module.id,
        "tier_id": module.tier_id,
        "tier_number": module.tier.number if module.tier else 1,
        "tier_title": module.tier.title if module.tier else "",
        "slug": module.slug,
        "title": module.title,
        "theory_markdown": module.theory_markdown,
        "gotchas_markdown": module.gotchas_markdown,
        "starter_code": module.starter_code,
        "visualizer_mode": module.visualizer_mode,
        "challenge_prompt": module.challenge_prompt,
        "test_code": module.test_code,
        "order_index": module.order_index,
        "progress": {
            "status": progress.status if progress else "not_started",
            "saved_code": progress.saved_code if progress and progress.saved_code else None,
            "user_notes": progress.user_notes if progress and progress.user_notes else "",
            "completed_at": progress.completed_at.isoformat() if progress and progress.completed_at else None
        } if progress else {
            "status": "not_started",
            "saved_code": None,
            "user_notes": "",
            "completed_at": None
        }
    }


@app.post("/api/execute/trace")
def trace_execution(payload: TraceRequest):
    """
    Executes Python code under sys.settrace() and returns frame-by-frame
    snapshot data (Stack frames, Heap objects, Pointers, Bytecode, Stdout, Call Tree).
    """
    result = execute_trace(payload.code, timeout_seconds=payload.timeout_seconds or 3.5)
    return result


@app.post("/api/execute/verify")
def verify_solution(payload: VerifyRequest, db: Session = Depends(get_db)):
    """
    Runs user code against module's automated test suite assertions.
    If passed, marks the module as 'completed' in SQLite.
    """
    module = db.query(TopicModule).filter(TopicModule.slug == payload.slug).first()
    if not module:
        raise HTTPException(status_code=404, detail="Topic module not found")

    test_res = verify_code(payload.code, module.test_code)

    if test_res.get("passed"):
        progress = db.query(UserProgress).filter(UserProgress.module_id == module.id).first()
        if not progress:
            progress = UserProgress(
                module_id=module.id,
                status="completed",
                saved_code=payload.code,
                completed_at=datetime.utcnow()
            )
            db.add(progress)
        else:
            progress.status = "completed"
            progress.saved_code = payload.code
            progress.completed_at = datetime.utcnow()
        db.commit()

    return test_res


@app.get("/api/gotchas")
def list_gotchas(db: Session = Depends(get_db)):
    """
    Returns list of tricky edge-case gotchas for the quiz lab.
    """
    gotchas = db.query(GotchaChallenge).all()
    results = []
    for g in gotchas:
        try:
            options = json.loads(g.options_json)
        except Exception:
            options = []

        results.append({
            "id": g.id,
            "title": g.title,
            "category": g.category,
            "tricky_code": g.tricky_code,
            "options": options
        })
    return {"gotchas": results}


@app.post("/api/gotchas/check")
def check_gotcha_answer(payload: GotchaCheckRequest, db: Session = Depends(get_db)):
    """
    Evaluates quiz answer and returns deep conceptual explanation.
    """
    gotcha = db.query(GotchaChallenge).filter(GotchaChallenge.id == payload.id).first()
    if not gotcha:
        raise HTTPException(status_code=404, detail="Gotcha challenge not found")

    is_correct = (payload.selected_option.strip() == gotcha.correct_output.strip())
    return {
        "is_correct": is_correct,
        "correct_output": gotcha.correct_output,
        "deep_explanation": gotcha.deep_explanation
    }


@app.get("/api/progress")
def get_overall_progress(db: Session = Depends(get_db)):
    """
    Returns platform-wide completion statistics.
    """
    total_modules = db.query(TopicModule).count()
    completed_count = db.query(UserProgress).filter(UserProgress.status == "completed").count()

    percentage = round((completed_count / total_modules * 100), 1) if total_modules > 0 else 0.0

    return {
        "total_modules": total_modules,
        "completed_modules": completed_count,
        "completion_percentage": percentage
    }


@app.post("/api/progress/notes")
def save_notes_and_code(payload: ProgressSaveRequest, db: Session = Depends(get_db)):
    """
    Auto-saves user notes and active code for a given module.
    """
    module = db.query(TopicModule).filter(TopicModule.slug == payload.slug).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    progress = db.query(UserProgress).filter(UserProgress.module_id == module.id).first()
    if not progress:
        progress = UserProgress(
            module_id=module.id,
            status="in_progress",
            saved_code=payload.saved_code,
            user_notes=payload.user_notes
        )
        db.add(progress)
    else:
        if payload.saved_code is not None:
            progress.saved_code = payload.saved_code
        if payload.user_notes is not None:
            progress.user_notes = payload.user_notes
        if progress.status == "not_started":
            progress.status = "in_progress"

    db.commit()
    return {"success": True, "message": "Progress and notes saved successfully"}


@app.get("/api/snippets")
def list_snippets(db: Session = Depends(get_db)):
    snippets = db.query(ExecutionSnippet).order_by(ExecutionSnippet.created_at.desc()).limit(20).all()
    return [{
        "id": s.id,
        "title": s.title,
        "code": s.code,
        "created_at": s.created_at.isoformat() if s.created_at else None
    } for s in snippets]


@app.post("/api/snippets")
def save_snippet(payload: SnippetSaveRequest, db: Session = Depends(get_db)):
    snippet = ExecutionSnippet(
        title=payload.title,
        code=payload.code
    )
    db.add(snippet)
    db.commit()
    db.refresh(snippet)
    return {
        "id": snippet.id,
        "title": snippet.title,
        "code": snippet.code,
        "created_at": snippet.created_at.isoformat() if snippet.created_at else None
    }


# --- LeetCode Problem & Arena Endpoints ---

class LeetCodeVerifyRequest(BaseModel):
    slug: str
    code: str


@app.get("/api/leetcode")
def list_leetcode_problems(db: Session = Depends(get_db)):
    """
    Returns list of all LeetCode problems with difficulty and category.
    """
    problems = db.query(LeetCodeProblem).order_by(LeetCodeProblem.number).all()
    return [{
        "id": p.id,
        "number": p.number,
        "slug": p.slug,
        "title": p.title,
        "difficulty": p.difficulty,
        "category": p.category,
        "time_complexity": p.time_complexity,
        "space_complexity": p.space_complexity,
        "hints": p.hints
    } for p in problems]


@app.get("/api/leetcode/{slug}")
def get_leetcode_problem(slug: str, db: Session = Depends(get_db)):
    """
    Returns full details for a LeetCode problem including description and starter code.
    """
    problem = db.query(LeetCodeProblem).filter(LeetCodeProblem.slug == slug).first()
    if not problem:
        raise HTTPException(status_code=404, detail="LeetCode problem not found")

    return {
        "id": problem.id,
        "number": problem.number,
        "slug": problem.slug,
        "title": problem.title,
        "difficulty": problem.difficulty,
        "category": problem.category,
        "description": problem.description,
        "starter_code": problem.starter_code,
        "test_code": problem.test_code,
        "time_complexity": problem.time_complexity,
        "space_complexity": problem.space_complexity,
        "hints": problem.hints
    }


@app.post("/api/leetcode/verify")
def verify_leetcode_solution(payload: LeetCodeVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies user solution against automated test assertions for a LeetCode problem.
    """
    problem = db.query(LeetCodeProblem).filter(LeetCodeProblem.slug == payload.slug).first()
    if not problem:
        raise HTTPException(status_code=404, detail="LeetCode problem not found")

    test_res = verify_code(payload.code, problem.test_code)
    return test_res

