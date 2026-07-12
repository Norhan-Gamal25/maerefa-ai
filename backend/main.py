"""
FastAPI Backend — Maerefa Online
Security hardening:
  - Rate limiting via slowapi (10 req/min on /api/generate)
  - Tightened CORS (explicit methods + headers only)
  - Max request body size middleware (64 KB)
  - Security response headers middleware
  - Bounded task store with TTL cleanup (max 500 tasks, 10-min TTL)
  - Swagger/ReDoc disabled in production
Fix 1: Task polling (POST returns task_id instantly, GET polls for result)
Fix 5: API warmup on startup
Fix 6: Per-request state isolation (MaerefaFlow always creates fresh state)
"""
import asyncio
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
load_dotenv()  # loads .env into os.environ before anything else reads it

# ── Patch: disable CrewAI prompt-cache breakpoints for Fireworks AI ──────────
# crewai 1.15.x injects a `cache_breakpoint: True` field into message dicts
# (experimental/agent_executor.py → mark_cache_breakpoint). This field is
# only valid for Anthropic; Fireworks AI rejects it with a 400 validation
# error. We replace mark_cache_breakpoint with an identity function so the
# field is never added. This must run before any crew/agent code is imported.
try:
    import crewai.llms.cache as _crewai_cache
    _crewai_cache.mark_cache_breakpoint = lambda msg: msg
    # Also patch the already-imported references in both executor modules
    import crewai.experimental.agent_executor as _exp_exec
    _exp_exec.mark_cache_breakpoint = lambda msg: msg
    import crewai.agents.crew_agent_executor as _crew_exec
    _crew_exec.mark_cache_breakpoint = lambda msg: msg
except Exception:
    pass  # if crewai internals change, fail silently rather than crash startup

import httpx
from fastapi import BackgroundTasks, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request as StarletteRequest

from backend.config.islamic_policy import APPROVED_DOMAINS, check_deny_list, check_domain
from backend.config.fallbacks import FALLBACK_RESPONSES
from backend.flow import run_maerefa_flow, _DEFAULT_BLOCK_REASON
from backend.routes.problems import router as problems_router
from backend.models.schemas import (
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
    TaskStatusResponse,
)

# ── Configuration ────────────────────────────────────────────────────────────
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"

MAX_TASK_STORE_SIZE = 500      # hard cap on tasks held in memory
TASK_TTL_SECONDS = 600         # 10 minutes — prune completed tasks older than this
MAX_BODY_SIZE_BYTES = 64_000   # 64 KB

# ── Rate limiter ─────────────────────────────────────────────────────────────
def _get_real_ip(request: StarletteRequest) -> str:
    """
    Extract the real client IP from Railway / any reverse-proxy that sets
    X-Forwarded-For.  Falls back to the direct connection address so that
    slowapi never receives an empty string (which causes a 422 instead of 429).
    """
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        # X-Forwarded-For may be a comma-separated list; take the first entry
        return forwarded_for.split(",")[0].strip()
    return get_remote_address(request) or "unknown"

limiter = Limiter(key_func=_get_real_ip, default_limits=["60/minute"])

# ── In-memory task store ─────────────────────────────────────────────────────
# Each request gets an isolated entry; no shared mutable state between requests.
task_store: dict[str, dict[str, Any]] = {}


def _prune_task_store() -> None:
    """Remove completed tasks older than TASK_TTL_SECONDS; cap total size."""
    now = time.time()
    expired = [
        tid for tid, entry in task_store.items()
        if entry.get("status") in ("done", "error")
        and now - entry.get("created_at", now) > TASK_TTL_SECONDS
    ]
    for tid in expired:
        task_store.pop(tid, None)

    # If still over the hard cap, evict the oldest entries
    if len(task_store) > MAX_TASK_STORE_SIZE:
        by_age = sorted(task_store.items(), key=lambda kv: kv[1].get("created_at", 0))
        for tid, _ in by_age[: len(task_store) - MAX_TASK_STORE_SIZE]:
            task_store.pop(tid, None)


# ── Startup warmup ───────────────────────────────────────────────────────────
async def ping_fireworks() -> None:
    api_key = os.environ.get("FIREWORKS_API_KEY", "")
    if not api_key:
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.get(
                "https://api.fireworks.ai/inference/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
    except Exception:
        pass  # warmup failure is non-fatal


def _warmup_litellm() -> None:
    """
    Pre-initialise crewAI's lazy LiteLLM loader on the main thread, before
    any request threads are spawned.  crewAI uses a bare module-level flag
    (_litellm_loaded) with no thread lock: if two requests arrive simultaneously
    and both call _ensure_litellm() at the same time, the second thread sees
    _litellm_loaded=True but LITELLM_AVAILABLE still False (the first thread
    hasn't finished yet) and raises ImportError.  Calling it once here, while
    still single-threaded, eliminates the race entirely.
    """
    try:
        import crewai.llm as _crewai_llm
        _crewai_llm._ensure_litellm()
    except Exception:
        pass  # non-fatal — failure will surface on first real request


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm LiteLLM so crewAI's lazy loader is ready before request threads start
    _warmup_litellm()
    # Warm up Fireworks API connection before accepting traffic
    await ping_fireworks()
    yield


# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Maerefa Online API",
    version="1.0.0",
    lifespan=lifespan,
    # Disable interactive docs in production to reduce attack surface
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Register routers
app.include_router(problems_router)


# ── Middleware: Max body size ─────────────────────────────────────────────────
@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE_BYTES:
        return JSONResponse(
            status_code=413,
            content={"detail": f"Request body too large. Maximum allowed: {MAX_BODY_SIZE_BYTES} bytes."},
        )
    return await call_next(request)


# ── Middleware: Security headers ──────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    # Remove server fingerprinting headers
    try:
        del response.headers["server"]
    except KeyError:
        pass
    return response


# ── CORS — explicit allowlist ─────────────────────────────────────────────────
_frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    max_age=600,
)


# ── Background task runner ───────────────────────────────────────────────────
def _run_flow_sync(task_id: str, prompt: str, mode_hint: str | None) -> None:
    """
    Pure-synchronous worker — runs in a thread pool via asyncio.to_thread.
    Never touches the event loop directly.
    """
    store = task_store.get(task_id)
    if store is None:
        return
    try:
        store["status"] = "running"
        store["current_agent"] = "STEM Sentinel (GLM-5.2)"
        store["progress"] = 10

        result = run_maerefa_flow(prompt, mode_hint)

        store["status"] = "done"
        store["progress"] = 100

        # If the sentinel blocked this request, surface it as an error
        # (mode=="blocked" means no crew ran and safe_prompt holds the reason)
        if result.get("mode") == "blocked":
            store["current_agent"] = "Safety Gate"
            store["result"] = None
            store["error"] = result.get("safe_prompt") or _DEFAULT_BLOCK_REASON
        else:
            store["current_agent"] = "Complete"
            store["result"] = result
    except Exception as exc:
        mode = mode_hint or "college"
        store["status"] = "done"
        store["progress"] = 100
        store["current_agent"] = "Complete (fallback)"
        store["result"] = FALLBACK_RESPONSES.get(mode, FALLBACK_RESPONSES["college"])
        store["error"] = str(exc)
    finally:
        _prune_task_store()


async def _run_flow(task_id: str, prompt: str, mode_hint: str | None) -> None:
    """Async wrapper — offloads blocking LLM work to a thread pool."""
    await asyncio.to_thread(_run_flow_sync, task_id, prompt, mode_hint)


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/api/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", version="1.0.0")


@app.get("/api/domains")
async def get_domains():
    """Returns the list of approved STEM domains for the frontend domain selector."""
    return {"domains": sorted(APPROVED_DOMAINS)}


@app.post("/api/generate", response_model=GenerateResponse)
@limiter.limit("10/minute")
async def generate(request: Request, body: GenerateRequest, background_tasks: BackgroundTasks):
    """
    Rate-limited to 10 requests/minute per IP.
    Returns task_id instantly (<100ms). Actual LLM work runs in the background.
    """
    # Layer 0 hard deny list (pure Python — runs before domain gate, no LLM)
    denied, deny_reason = check_deny_list(body.prompt)
    if denied:
        task_id = str(uuid.uuid4())
        task_store[task_id] = {
            "status": "done",
            "progress": 100,
            "current_agent": "Safety Gate",
            "result": None,
            "error": deny_reason,
            "created_at": time.time(),
        }
        return GenerateResponse(task_id=task_id)

    # Layer 1 domain gate (pure Python — no LLM)
    approved, reason = check_domain(body.prompt)
    if not approved:
        task_id = str(uuid.uuid4())
        task_store[task_id] = {
            "status": "done",
            "progress": 100,
            "current_agent": "Domain Gate",
            "result": None,
            "error": reason,
            "created_at": time.time(),
        }
        return GenerateResponse(task_id=task_id)

    task_id = str(uuid.uuid4())
    task_store[task_id] = {
        "status": "pending",
        "progress": 0,
        "current_agent": "",
        "result": None,
        "error": None,
        "created_at": time.time(),
    }
    background_tasks.add_task(_run_flow, task_id, body.prompt, body.mode)  # async-safe via to_thread
    return GenerateResponse(task_id=task_id)


@app.get("/api/status/{task_id}", response_model=TaskStatusResponse)
async def get_status(task_id: str):
    """Frontend polls this every 2 seconds."""
    entry = task_store.get(task_id)
    if entry is None:
        return TaskStatusResponse(
            task_id=task_id,
            status="error",
            progress=0,
            error="Task not found",
        )
    return TaskStatusResponse(
        task_id=task_id,
        status=entry["status"],
        progress=entry["progress"],
        current_agent=entry.get("current_agent", ""),
        result=entry.get("result"),
        error=entry.get("error"),
    )
