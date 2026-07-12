# ── Backend Dockerfile (FastAPI + CrewAI, Python 3.11, multi-stage) ─────────
FROM python:3.11-slim AS base

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    # Virtual environment path used across all stages
    VIRTUAL_ENV=/opt/venv

WORKDIR /app
# Give the system user a real home dir so libs like mem0/crewai can write
# their config/cache there at runtime.
RUN addgroup --system maerefa \
 && adduser --system --group --home /home/maerefa maerefa \
 && mkdir -p /home/maerefa \
 && chown maerefa:maerefa /home/maerefa

# ── Build stage — create venv and install deps ───────────────────────────────
FROM base AS builder
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY backend/requirements.txt .
RUN pip install --no-cache-dir \
    --use-deprecated=legacy-resolver \
    --timeout=300 \
    --retries=5 \
    -r requirements.txt

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM base AS runtime

# Copy the entire venv from builder — avoids any --user path mismatch
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/ ./backend/

RUN chown -R maerefa:maerefa /app /home/maerefa
# Explicitly tell Python libs where HOME is (mem0, crewai, etc.)
ENV HOME=/home/maerefa
USER maerefa

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
