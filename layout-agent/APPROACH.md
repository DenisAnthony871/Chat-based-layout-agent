# Approach

## Overview

The Layout Agent is a full-stack chat interface that transforms a 1080×1080 Instagram Post design JSON using natural language instructions. The user types things like *"convert to 9:16"* or *"move the headline to the top"*, and the agent returns a fully updated JSON with all coordinates recalculated — plus a short explanation shown in the chat.

---

## Key Design Decisions

### 1. Normalized Coordinates as the Source of Truth

The design JSON carries two coordinate systems per node:
- **Absolute pixels**: `x`, `y`, `width`, `height`
- **Normalized ratios**: `nx`, `ny`, `nw`, `nh` (0–1 relative to artboard dimensions)

When changing aspect ratio (e.g., 1:1 → 9:16), normalized values are stable — they represent *where* an element sits proportionally. The transformation is simply:

```text
new_x     = nx * new_artboard_width
new_y     = ny * new_artboard_height
new_width = nw * new_artboard_width
new_height= nh * new_artboard_height
```

This avoids brittle pixel math for every node and lets the LLM reason in proportional terms. The agent always keeps both systems in sync.

### 2. System Prompt with Explicit Semantic Roles

Rather than dumping the raw JSON schema and hoping the model figures it out, the system prompt explicitly names each semantic layer:

| Node | Role |
| --- | --- |
| `Background.png` | Full-canvas background (always fills artboard) |
| `Product.png` | Main product image |
| 72px italic bold text | Headline |
| 48px text ("Comfort that defines…") | Subheadline |
| `circle_*` + "20% OFF" text | Offer badge (always moved together) |
| Star `Vector` images + "Over 8,000…" | Social proof row |
| "Limited time offer" | CTA / footer |

This means instructions like *"move the badge higher"* work correctly without the model having to guess which nodes are involved.

### 3. Conversation History for Multi-Turn Follow-Ups

Every API call includes the full prior conversation (user + assistant turns) so the agent maintains context across chained instructions:

> "Convert to 9:16" → "Now keep the product large" → "Move the headline up"

Each instruction is applied to the **latest** JSON snapshot, not the original.

### 4. Dual Output: Transformed JSON + One-Line Explanation

The main model (`llama-3.3-70b-versatile`) returns the full updated JSON. A second, faster call to `llama-3.1-8b-instant` generates a one-sentence summary of what changed, shown in the chat bubble. This keeps the chat conversational while the JSON viewer shows the raw diff.

Using two models avoids making the main heavy model also write prose — keeping latency low and JSON output clean.

### 5. Temperature = 0.1 for Deterministic JSON

The main layout transform call uses `temperature=0.1`. JSON transformation is a deterministic task — low temperature prevents the model from hallucinating field names or values while still allowing it to reason through spatial calculations.

### 6. Wireframe + Preview Canvas

The canvas has two rendering modes:

- **Wireframe**: Semantic labeled boxes with a dark scrim overlay. Labels are always short (Headline / Product / Badge / CTA) — never raw text content. Node colors by type: blue=image, purple=text, green=shape. Hover shows exact pixel coordinates.
- **Preview**: Actual images loaded from Cloudinary CDN + text rendered with correct font, weight, style, and size at scale.

Both update instantly when the agent returns new JSON (Vite HMR in dev, React state in prod).

### 7. Undo/Redo Stack (Client-Side)

Every successful agent response pushes the *previous* JSON snapshot onto an undo stack. This gives users a reliable escape hatch without needing any backend state — the full history lives in React state.

---

## Why Groq + Llama over Claude/GPT-4?

- **Groq is fast**: `llama-3.3-70b-versatile` on Groq returns results in ~2–4s for a full JSON transform. Claude Opus on the free tier is slower and has stricter rate limits.
- **llama-3.3-70b handles structured JSON reliably**: With a low temperature and explicit output format instructions, it follows the schema consistently.
- **Free tier works for testing**: Groq's free API is sufficient for this use case without needing billing setup.

---

## What I'd Add with More Time

- **LangGraph ReAct agent loop**: Instead of a single LLM call, use a tool-calling loop where the agent calls sub-tools (`resize_node`, `move_node`, `rescale_artboard`) and validates constraints between steps. This would make complex multi-step instructions more reliable and debuggable.
- **Streaming responses**: Stream the JSON token-by-token so the UI updates progressively instead of waiting for the full response.
- **LangSmith tracing**: Add per-turn prompt + output logging and eval scoring (spatial accuracy, schema validity) using LangSmith — directly applicable from my Jio RAG pipeline experience.
- **PNG rendering**: Use headless Playwright/Puppeteer to render the actual design at full resolution and return a preview image alongside the JSON.
- **Constraint validation layer**: A post-processing step that checks all nodes remain within artboard bounds and flags overlaps before returning the JSON to the client.
