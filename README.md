# Maerefa AI — معرفة
### Where Creativity Meets STEM

> **Live Demo:** [maerefa-ai.vercel.app](https://maerefa-ai.vercel.app)
> **Backend API:** [maerefa-backend on Railway](https://maerefa-backend.up.railway.app)

---

## What Is Maerefa?

**Maerefa** (Arabic: معرفة — *knowledge*) is an AI-powered STEM learning platform that transforms any scientific topic into a full, multi-layered educational experience — instantly. It adapts its entire output to three distinct audiences: children (ages 8–14), college students, and active researchers.

A single prompt like *"quantum entanglement"* produces:

- A **technical explanation** with LaTeX equations, physical intuition, and real applications
- **Wonder cards** — surprising, memorable facts that build genuine curiosity
- A **structured quiz** — 8 questions ranging from MCQ to open-ended synthesis
- An **AI-generated aniconic illustration** — geometric, culturally respectful, visually stunning
- **Interactive algorithm/concept visualizers** — live animated CS and physics simulations

---

## Creativity and Originality

### A Multi-Agent AI Orchestration Pipeline

Maerefa does not call a single LLM and format the output. It runs a **multi-agent CrewAI pipeline** where specialized AI agents collaborate in parallel:

```
User Prompt
    │
    ▼
┌─────────────────────────────────────┐
│  STEM Sentinel (GLM-5.2)            │  ← Domain guard + mode classifier
│  Layer 0: keyword deny list         │    + aniconic visual prompt crafter
│  Layer 1: domain gate (pure Python) │
└──────────────┬──────────────────────┘
               │  routes to →
    ┌──────────┼──────────┐
    ▼          ▼          ▼
  Kids       College   Researcher
  Crew        Crew       Crew
    │          │          │
    └──────────┴──────────┘
               │
               ▼
    FireworksImageTool (SDXL)
    Islamic negative prompt hardcoded
               │
               ▼
    Complete Learning Package
```

Each crew runs **4 parallel LLM tasks** via `ThreadPoolExecutor`, delivering a full response in ~45 seconds.

### Novel Behaviors

| Feature | Why It's Novel |
|---|---|
| **Three-tier audience adaptation** | Not just tone — the entire JSON schema, agent roster, task prompts, and UI layout change per mode |
| **Aniconic image generation** | `ISLAMIC_NEGATIVE_PROMPT` is hardcoded at the tool level and cannot be overridden by any agent — geometric/abstract art only |
| **Live algorithm visualizer** | Detects CS algorithms in the prompt (BFS, Dijkstra, sorting, etc.) and renders animated step-by-step visualizations directly in the browser |
| **Concept visualizer** | Physics/chemistry concepts (waves, circuits, thermodynamics) trigger interactive SVG simulations |
| **Bilingual Arabic/English output** | Detects Arabic script in the prompt and instructs all agents to produce side-by-side bilingual JSON output |
| **Three-layer safety system** | Keyword deny list → domain gate → LLM sentinel — three independent filters before any content is generated |
| **JSON repair pipeline** | `extract_json()` handles truncated LLM output with bracket-balancing, trailing-comma removal, and partial-close recovery |

---

## Product / Market Potential

### The Problem

Most AI learning tools are one-size-fits-all: a chatbot that answers questions. They don't adapt to the learner's level, don't produce structured assessments, and produce text that is not culturally or visually appropriate for all audiences.

### The Solution

Maerefa is a **vertical AI education platform** that serves three distinct market segments from a single product:

| Segment | User | Value |
|---|---|---|
| **K-12 Education** | Students aged 8–14 | Safe, engaging, culturally respectful STEM learning |
| **Higher Education** | University students | Instant structured study material with LaTeX equations and quizzes |
| **Research** | Graduate students & academics | Literature-aware analysis with research gaps and cross-domain links |

### Market Opportunity

- Global EdTech market: **$340B by 2025** (HolonIQ)
- AI in Education segment: **$20B by 2027** (MarketsandMarkets)
- MENA EdTech: fastest-growing region, underserved by English-first tools
- Maerefa's Arabic bilingual support and Islamic-compliant visuals directly address this gap

### Business Model

- **Freemium SaaS** — free tier (limited requests/day), Pro tier ($9/month), Institution tier (per-seat licensing)
- **API Access** — developers embed Maerefa's learning engine into their own products
- **White-label** — schools and universities deploy branded versions

### Competitive Moat

1. **Cultural fit** — aniconic art + Arabic bilingual support is not offered by any major EdTech AI platform
2. **Structured output** — competitors return prose; Maerefa returns machine-readable JSON that drives rich UI
3. **Mode specialization** — the researcher mode produces citation-aware academic analysis, not a summary

---

## Completeness

The submitted project is a **fully functional, production-deployed application** — not a prototype or demo.

### What Is Built and Working

| Component | Status |
|---|---|
| FastAPI backend with async task queue | ✅ Production |
| CrewAI multi-agent pipeline (3 modes × 15 agents) | ✅ Production |
| Three-layer safety/guardrail system | ✅ Production |
| Next.js 14 frontend with dark design system | ✅ Production |
| Algorithm visualizer (BFS, DFS, Dijkstra, sorting, trees) | ✅ Production |
| Concept visualizer (waves, circuits, thermodynamics, etc.) | ✅ Production |
| LaTeX equation rendering (KaTeX) | ✅ Production |
| RTL/Arabic bilingual output | ✅ Production |
| Aniconic AI image generation (SDXL) | ✅ Production |
| Rate limiting (slowapi, 10 req/min per IP) | ✅ Production |
| Security headers, CORS, body-size limits | ✅ Production |
| Docker multi-stage builds | ✅ Production |
| Railway backend deployment | ✅ Live |
| Vercel frontend deployment | ✅ Live |
| CI/CD via GitHub (auto-deploy on push) | ✅ Active |

### Architecture

```
┌─────────────────────┐     HTTPS      ┌──────────────────────────────┐
│   Vercel             │ ◄────────────► │   Railway                    │
│   Next.js 14         │                │   FastAPI + CrewAI           │
│   TypeScript         │                │   Python 3.11                │
│   KaTeX rendering    │                │   Docker (multi-stage)       │
│   SVG visualizers    │                │                              │
└─────────────────────┘                └──────────────┬───────────────┘
                                                       │
                                                       ▼
                                          ┌─────────────────────────┐
                                          │   Fireworks AI           │
                                          │   GLM-5.2 (Sentinel)     │
                                          │   GLM-5.1 (Content)      │
                                          │   SDXL (Images)          │
                                          │   AMD Instinct GPUs      │
                                          └─────────────────────────┘
```

---

## Use of AMD Platforms

### Fireworks AI — AMD Instinct GPU Fleet

All LLM inference and image generation in Maerefa runs on **Fireworks AI**, which operates on **AMD Instinct GPU infrastructure** (MI300X and MI250X series) via ROCm.

Every AI call in the project — without exception — routes through Fireworks AI:

| Model | Role | AMD Hardware |
|---|---|---|
| **GLM-5.2** (`glm-5p2`) | STEM Sentinel — domain guard, mode classifier | AMD Instinct MI300X |
| **GLM-5.1** (`glm-5p1`) | All 15 content agents (explanation, quiz, wonder, visual) | AMD Instinct MI300X |
| **Stable Diffusion XL** | Aniconic STEM image generation | AMD Instinct MI250X |

### Why This Matters

Fireworks AI's AMD-backed infrastructure provides:

- **Sub-second token generation** — GLM-5.2 (sentinel) responds in <15s; content agents in <120s
- **Parallel inference** — 4 simultaneous LLM tasks per request are handled without queuing
- **JSON-mode enforcement** — `response_format: {"type": "json_object"}` is honored reliably, critical for Maerefa's structured output pipeline
- **Cost efficiency** — AMD GPU pricing on Fireworks AI makes the free tier viable for a student project

### Configuration

```python
# backend/config/llms.py
def get_granite_llm() -> LLM:
    return LLM(
        model="fireworks_ai/accounts/fireworks/models/glm-5p1",  # AMD Instinct
        temperature=0.2,
        max_tokens=3072,
        response_format={"type": "json_object"},  # structured JSON output
        timeout=120,
        max_retries=2,
    )
```

All image generation uses Fireworks AI's SDXL endpoint with a hardcoded Islamic negative prompt — ensuring every generated image is geometrically abstract, never depicting living beings.

---

## Running Locally

### Prerequisites
- Docker Desktop
- A [Fireworks AI](https://fireworks.ai) API key

### Steps

```bash
git clone https://github.com/Norhan-Gamal25/maerefa-ai
cd maerefa-ai

# Create environment file
cp .env.example .env
# Edit .env — set FIREWORKS_API_KEY and NEXT_PUBLIC_API_URL=http://localhost:8000

# Build and run
docker compose up --build
```

Open **http://localhost:3000**

---

## Project Structure

```
maerefa-ai/
├── backend/
│   ├── agents/          # 15 specialized CrewAI agents
│   ├── config/          # LLM config, safety policy, fallbacks
│   ├── crews/           # KidsCrew, CollegeCrew, ResearcherCrew, GuardrailCrew
│   ├── tasks/           # Explanation, quiz, wonder, visual, guardrail tasks
│   ├── tools/           # FireworksImageTool (SDXL + Islamic compliance)
│   ├── routes/          # /api/problems, /api/top-problems
│   └── main.py          # FastAPI app, rate limiting, security middleware
├── frontend/
│   ├── app/             # Next.js 14 App Router pages
│   ├── components/      # ExplanationPanel, AlgoVisualizer, QuizPanel, etc.
│   └── lib/             # API client, LaTeX renderer, algorithm detector
├── Dockerfile           # Backend multi-stage Docker build
├── Dockerfile.frontend  # Frontend multi-stage Docker build
└── docker-compose.yml   # Local development orchestration
```

---

## License

MIT License — see [LICENSE](LICENSE)

---

*Built with Fireworks AI (AMD Instinct GPU infrastructure), CrewAI, FastAPI, and Next.js 14.*
