# Layout Agent

> Transform Instagram Post design JSON using natural language — powered by Llama 3.3 on Groq.

![Layout Agent UI](https://res.cloudinary.com/dzydbgyfj/image/upload/v1778502510/Instagram_Post_1080x1080_19_iw9uqy.png)

---

## What It Does

Chat with an AI agent to transform a 1080×1080 Instagram Post design JSON in real time:

| Instruction | What happens |
| --- | --- |
| `"Convert this design to 9:16"` | Rescales all x/y/width/height via normalized coordinates |
| `"Move the headline to the top"` | Updates headline's y/ny values to ~0.04 |
| `"Make the headline smaller"` | Reduces fontSize by ~25%, updates fontSizeRatio |
| `"Keep the product large"` | Scales product nw/nh by 1.3–1.5× during resize |
| `"Move the offer badge higher"` | Moves the circle + "20% OFF" text together |
| `"Center the subheadline"` | Sets nx = 0.5 - nw/2 |

Each instruction builds on the previous state — full conversation history is maintained.

---

## UI Features

- **Wireframe tab** — semantic labeled boxes per layer (Headline / Product / Badge / CTA…), hover for pixel coordinates
- **Preview tab** — actual images + text rendered at correct scale, font, and color
- **JSON tab** — syntax-highlighted diff viewer with changed-field count and line numbers
- **Undo / Redo** — step back and forward through transformation history
- **Export JSON** — download the current state as `layout.json`
- **Quick Actions** — one-click chips for common transforms

---

## Prerequisites

- Python 3.12+ with [`uv`](https://github.com/astral-sh/uv)
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free)

---

## Setup

### 1. Backend

```bash
cd layout-agent/backend

# Copy and fill in your Groq key
cp .env.example .env          # Mac/Linux
# copy .env.example .env      # Windows
# Edit .env: GROQ_API_KEY=gsk_...

# Install dependencies
uv pip install -r requirements.txt

# Start the API server
uvicorn main:app --reload --port 8000
```

Verify at: <http://127.0.0.1:8000/health> → `{"status":"ok"}`  
Interactive docs: <http://127.0.0.1:8000/docs>

### 2. Frontend (separate terminal)

```bash
cd layout-agent/frontend
npm install
npm run dev
```

Open <http://localhost:5173>

---

## Architecture

```text
layout-agent/
├── backend/
│   ├── agent.py        ← Groq (llama-3.3-70b) with spatial reasoning system prompt
│   │                      + llama-3.1-8b-instant for 1-line change summaries
│   ├── main.py         ← FastAPI: POST /api/chat · GET /health
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── vite.config.js  ← proxies /api → localhost:8000
    └── src/
        ├── App.jsx                 ← Chat UI, undo/redo, 3-tab layout
        ├── initialJson.js          ← Instagram Post 1080×1080 design JSON
        ├── index.css               ← Design system (dark violet-gold theme)
        └── components/
            ├── CanvasPreview.jsx   ← Wireframe + Preview renderer
            └── JsonViewer.jsx      ← Syntax-highlighted JSON diff
```

---

## API

```text
POST /api/chat
{
  "instruction": "Convert this design to 9:16",
  "current_json": { ...design JSON... },
  "history": [ {"role": "user", "content": "..."}, ... ]
}

→ {
  "updated_json": { ...transformed JSON... },
  "explanation": "Rescaled artboard to 1080×1920 and recomputed all node positions."
}
```

---

## Design Decisions

See [APPROACH.md](APPROACH.md) for the full technical writeup.
