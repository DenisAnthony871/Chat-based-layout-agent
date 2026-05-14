import os
import json
import re
from groq import AsyncGroq
from dotenv import load_dotenv
from json_repair import repair_json
from typing import Any

load_dotenv()

client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])

MAIN_MODEL = "llama-3.3-70b-versatile"
FAST_MODEL = "llama-3.1-8b-instant"

_STRIP_DATA_KEYS = {"sourceUrl", "assetId"}
_STRIP_NODE_KEYS = {"parentId"}

SYSTEM_PROMPT = """You are a Layout Agent that transforms design JSON based on natural language instructions.

## JSON Structure
Each node in `nodes` has:
- `x`, `y`: absolute pixel position (top-left) relative to artboard
- `width`, `height`: absolute pixel dimensions
- `nx`, `ny`: normalized position (0–1) relative to artboard width/height
- `nw`, `nh`: normalized size (0–1) relative to artboard width/height
- `type`: "image" | "text" | "shape" | "artboard"
- `name`: semantic name
- `style.visual.fontSize`: font size (text nodes)
- `fontSizeRatio`: fontSize / artboard_width

## Semantic Roles
- **Background**: img named "Background.png" — covers full canvas
- **Product**: img named "Product.png" — main product image
- **Headline**: large italic bold text (72px, "Luxury Comfort…")
- **Subheadline**: medium text (48px, "Comfort that defines…")
- **Offer Badge**: yellow circle (circle_*) + "20% OFF" text — always move together
- **Social Proof**: star vector images + "Over 8,000 happy homes" text
- **CTA/Footer**: "Limited time offer" text at bottom

## Transformation Rules

### Aspect Ratio Change (e.g., 1:1 → 9:16)
1. Update artboard width/height (e.g., 9:16 → width=1080, height=1920)
2. For all non-artboard nodes: recompute absolute coords from normalized:
   - x = nx * new_width
   - y = ny * new_height
   - width = nw * new_width
   - height = nh * new_height
3. Background image: always set x=0, y=0, width=new_width, height=new_height, nx=0, ny=0, nw=1, nh=1
4. "Keep the product large" → scale up product's nw/nh by 1.3–1.5x (clamp to max 0.9)

### Moving Elements
- "Move X to the top" → set ny to 0.02–0.08, recompute y
- "Move X higher/lower" → adjust ny by ±0.08–0.15, recompute y
- "Move X to center" → set nx = 0.5 - nw/2, recompute x
- Always update BOTH absolute (x, y) and normalized (nx, ny)
- Offer badge = circle + "20% OFF" text — move both together

### Resizing Text
- "Make X smaller/larger" → adjust fontSize by ±20–30%, update fontSizeRatio = fontSize / artboard_width
- Adjust width/height/nw/nh proportionally

### General Rules
- Always keep normalized (nx, ny, nw, nh) and absolute (x, y, width, height) in sync
- Never move elements outside the artboard (0 ≤ nx ≤ 1–nw, 0 ≤ ny ≤ 1–nh)
- Preserve all node IDs and unmodified fields exactly

## Output Format
Return ONLY a valid JSON object — no markdown, no explanation, no code fences.
The JSON must have the same top-level structure as the input: { rootNodes, imageUrl, nodes }
"""


def _slim_json(design: dict) -> dict:
    """Strip bulky fields before sending to LLM to save tokens."""
    slim = {"rootNodes": design.get("rootNodes", []), "nodes": {}}
    if "imageUrl" in design:
        slim["imageUrl"] = design["imageUrl"]

    for node_id, node in design.get("nodes", {}).items():
        slim_node = {k: v for k, v in node.items() if k not in _STRIP_NODE_KEYS}
        if "data" in slim_node and isinstance(slim_node["data"], dict):
            slim_node["data"] = {
                k: v for k, v in slim_node["data"].items()
                if k not in _STRIP_DATA_KEYS
            }
        slim["nodes"][node_id] = slim_node

    return slim


def _restore_stripped_fields(updated: dict, original: dict) -> dict:
    """Re-inject stripped fields from original into LLM response."""
    for node_id, orig_node in original.get("nodes", {}).items():
        if node_id not in updated.get("nodes", {}):
            continue
        upd_node = updated["nodes"][node_id]

        if "parentId" in orig_node:
            upd_node["parentId"] = orig_node["parentId"]

        if "data" in orig_node and isinstance(orig_node["data"], dict):
            if "data" not in upd_node or not isinstance(upd_node.get("data"), dict):
                upd_node["data"] = {}
            for k in _STRIP_DATA_KEYS:
                if k in orig_node["data"]:
                    upd_node["data"][k] = orig_node["data"][k]

    return updated


def build_user_message(instruction: str, slim: dict) -> str:
    return (
        f"Instruction: {instruction}\n\n"
        f"Current Design JSON:\n{json.dumps(slim, indent=1)}\n\n"
        "Apply the instruction and return the complete updated JSON."
    )


def extract_json_from_response(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```\s*$", "", text, flags=re.MULTILINE)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find('{')
    end   = text.rfind('}')
    if start != -1 and end > start:
        candidate = text[start:end + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
        repaired = repair_json(candidate)
        return json.loads(repaired)

    raise ValueError("No JSON object found in model response")


def _is_valid_design(d: dict) -> bool:
    if not isinstance(d.get("nodes"), dict):
        return False
    root_id = (d.get("rootNodes") or [None])[0]
    if not root_id or root_id not in d["nodes"]:
        return False
    artboard = d["nodes"][root_id]
    w = artboard.get("width")
    h = artboard.get("height")
    if not isinstance(w, (int, float)) or not isinstance(h, (int, float)):
        return False
    if w <= 0 or h <= 0:
        return False
    return True


async def run_layout_agent(
    instruction: str,
    current_json: dict[str, Any],
    history: list[dict[str, str]],
) -> dict[str, Any]:

    slim = _slim_json(current_json)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({
        "role": "user",
        "content": build_user_message(instruction, slim),
    })

    response = await client.chat.completions.create(
        model=MAIN_MODEL,
        max_tokens=3500,
        messages=messages,
        temperature=0.1,
    )

    raw = response.choices[0].message.content

    try:
        updated_json = extract_json_from_response(raw)
    except (json.JSONDecodeError, ValueError):
        return {
            "updated_json": current_json,
            "explanation": "No layout change — I only handle layout transforms like resizing, moving, or reformatting.",
        }

    if not _is_valid_design(updated_json):
        return {
            "updated_json": current_json,
            "explanation": "No layout change — I only handle layout transforms like resizing, moving, or reformatting.",
        }

    updated_json = _restore_stripped_fields(updated_json, current_json)
    explanation = await _generate_explanation(instruction)

    return {"updated_json": updated_json, "explanation": explanation}


async def _generate_explanation(instruction: str) -> str:
    """Fast model — one-line summary of what changed."""
    response = await client.chat.completions.create(
        model=FAST_MODEL,
        max_tokens=60,
        temperature=0.3,
        messages=[{
            "role": "user",
            "content": (
                f"The user said: \"{instruction}\". "
                "Summarize in ONE sentence (max 15 words) what layout change was made. "
                "Be specific. No preamble."
            ),
        }],
    )
    return response.choices[0].message.content.strip()
