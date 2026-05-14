from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any
from agent import run_layout_agent

app = FastAPI(title="Layout Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    instruction: str
    current_json: dict[str, Any]
    history: list[dict[str, str]] = Field(default_factory=list)

class ChatResponse(BaseModel):
    updated_json: dict[str, Any]
    explanation: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        result = await run_layout_agent(
            instruction=req.instruction,
            current_json=req.current_json,
            history=req.history,
        )
        return result
    except Exception as e:
        err_str = str(e)
        # Groq rate limits — return original JSON unchanged
        if "rate_limit" in err_str.lower() or "429" in err_str or "413" in err_str:
            return ChatResponse(
                updated_json=req.current_json,
                explanation="⏳ Rate limit reached — please wait a moment and try again.",
            )
        raise HTTPException(status_code=500, detail=err_str)

@app.get("/health")
def health():
    return {"status": "ok"}
