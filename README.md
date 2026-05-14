# Chat-Based Layout Agent

> Transform Instagram Post design JSON using natural language — powered by Llama 3.3 on Groq.

## Quick Start

```bash
# Backend
cd layout-agent/backend
cp .env.example .env          # Mac/Linux (add your GROQ_API_KEY)
# copy .env.example .env      # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd layout-agent/frontend
npm install
npm run dev
```

Open <http://localhost:5173>

## What It Does

Chat with an AI agent to transform a 1080×1080 Instagram Post design JSON in real time:

| Instruction | What happens |
| --- | --- |
| `"Convert this design to 9:16"` | Rescales artboard to 1080×1920, repositions all layers |
| `"Move the headline to the top"` | Updates headline's y/ny values |
| `"Make the headline smaller"` | Reduces fontSize by ~25% |
| `"Keep the product large"` | Scales product nw/nh by 1.3–1.5× |
| `"Move the offer badge higher"` | Moves circle + "20% OFF" text together |

Each instruction builds on the previous state — full conversation history is maintained.

## Features

- **Wireframe tab** — semantic labeled boxes per layer, hover for coordinates
- **Preview tab** — actual images + styled text at correct scale
- **JSON tab** — syntax-highlighted diff viewer with change count
- **Undo / Redo** — step through transformation history
- **Export JSON** — download current state as `layout.json`
- **Quick Actions** — one-click chips for common transforms

## Architecture

- **Backend**: FastAPI + Groq (`llama-3.3-70b-versatile` for transforms, `llama-3.1-8b-instant` for explanations)
- **Frontend**: React + Vite with wireframe/preview canvas and JSON diff viewer
- **State**: Normalized coordinates (`nx`, `ny`, `nw`, `nh`) for consistent scaling across aspect ratios

See [APPROACH.md](layout-agent/APPROACH.md) for the full technical writeup.
